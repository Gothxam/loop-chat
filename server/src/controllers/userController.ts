import { Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { AuthRequest } from '../middleware/auth.js';

export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const queryStr = req.query.q as string;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!queryStr || queryStr.trim() === '') {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    // Search by name, email, or username, excluding the current user
    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { name: { $regex: queryStr, $options: 'i' } },
        { email: { $regex: queryStr, $options: 'i' } },
        { username: { $regex: queryStr, $options: 'i' } },
      ],
    }).select('name email username photo status lastSeen');

    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, email, photo } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim().toLowerCase();
    if (photo !== undefined) updates.photo = photo;

    // Check email uniqueness if email is changing
    if (email) {
      const existingUser = await User.findOne({ email: updates.email, _id: { $ne: userId } });
      if (existingUser) {
        res.status(400).json({ message: 'Email is already taken' });
        return;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const listAllUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // List all users except self
    const users = await User.find({ _id: { $ne: userId } })
      .select('name email username photo status lastSeen');

    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

export const subscribePush = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      res.status(400).json({ message: 'Invalid subscription payload' });
      return;
    }

    await PushSubscription.findOneAndUpdate(
      { userId, 'subscription.endpoint': subscription.endpoint },
      { userId, subscription },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Subscribed to push notifications successfully' });
  } catch (error) {
    next(error);
  }
};

export const unsubscribePush = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ message: 'Endpoint is required to unsubscribe' });
      return;
    }

    await PushSubscription.findOneAndDelete({ userId, 'subscription.endpoint': endpoint });

    res.status(200).json({ message: 'Unsubscribed from push notifications successfully' });
  } catch (error) {
    next(error);
  }
};
