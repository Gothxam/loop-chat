'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Save, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { token, user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photo, setPhoto] = useState(user?.photo || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && (window as any).electronAPI?.getAutoStart) {
      (window as any).electronAPI.getAutoStart().then((enabled: boolean) => {
        setAutoStart(enabled);
      });
    }
  }, [isOpen]);

  const handleAutoStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoStart(checked);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.toggleAutoStart) {
      (window as any).electronAPI.toggleAutoStart(checked);
    }
  };

  if (!isOpen || !user) return null;

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB for profile pic)
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be smaller than 5MB');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fieldname', 'profile'); // Tag for folder storage

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setPhoto(data.fileUrl);
      } else {
        setError(data.message || 'Failed to upload photo');
      }
    } catch (err) {
      console.error(err);
      setError('Error uploading photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          email,
          photo,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        updateUser(data.user);
        setSuccess('Profile updated successfully');
        setTimeout(onClose, 1000);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      setError('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800/80">
          <h3 className="text-lg font-bold text-white">Profile Settings</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2 bg-red-950/20 border border-red-500/25 text-red-200 p-3 rounded-xl text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-950/20 border border-emerald-500/25 text-emerald-200 p-3 rounded-xl text-xs">
              {success}
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
              <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center overflow-hidden relative shadow-lg">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-zinc-350 font-semibold">{name.charAt(0)}</span>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <span className="text-xs text-zinc-450">Click avatar to upload photo</span>
          </div>

          {/* Username (Read-only) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 mb-1">
              Username
            </label>
            <input
              type="text"
              value={user.username}
              disabled
              className="w-full bg-zinc-950/60 border border-zinc-850 text-zinc-500 px-4 py-2.5 rounded-xl cursor-not-allowed outline-none"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-850 text-zinc-100 px-4 py-2.5 rounded-xl outline-none focus:border-zinc-700 transition-all"
            />
          </div>
 
          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-850 text-zinc-100 px-4 py-2.5 rounded-xl outline-none focus:border-zinc-700 transition-all"
            />
          </div>

          {/* Auto Start Preference */}
          {typeof window !== 'undefined' && (window as any).electronAPI && (
            <div className="flex items-center gap-2.5 py-1 select-none">
              <input
                id="autoStartCheckbox"
                type="checkbox"
                checked={autoStart}
                onChange={handleAutoStartChange}
                className="w-4 h-4 bg-zinc-950 border border-zinc-800 rounded focus:ring-purple-500/20 text-purple-600 outline-none cursor-pointer"
              />
              <label htmlFor="autoStartCheckbox" className="text-xs text-zinc-300 cursor-pointer font-medium">
                Start Loop Chat when Windows starts
              </label>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-[0.995]"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
