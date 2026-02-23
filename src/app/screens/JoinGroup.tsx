import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { doc, getDoc } from 'firebase/firestore';
import { db, ensureAuth } from '../firebase';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';

const MEMBER_COLORS = ['#DD843C','#C05A5A','#72A857','#5A7EC5','#C8914A','#9055A0','#5AABAB','#BD7A5A'];

function getInitials(name: string) {
  if (!name) return '?';
  const c = name.trim();
  return c.length === 1 ? c : c[0].toUpperCase();
}

export function JoinGroup() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { joinGroup, showToast } = useApp();
  const { t } = useT();

  const [groupName, setGroupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function fetchGroup() {
      try {
        await ensureAuth();
        const snap = await getDoc(doc(db, 'groups', groupId!));
        if (snap.exists()) {
          setGroupName(snap.data().name || t.joinGroup.unnamedGroup);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch group:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchGroup();
  }, [groupId]);

  async function handleJoin() {
    if (!name.trim() || !groupId || isJoining) return;
    setIsJoining(true);
    try {
      const color = MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
      const memberData = {
        id: Date.now().toString(),
        name: name.trim(),
        initials: getInitials(name),
        color,
        role: 'member' as const,
      };
      await joinGroup(groupId, memberData);
      showToast('success', t.joinGroup.joinSuccess);
      navigate('/app/dashboard');
    } catch (err) {
      console.error('Failed to join group:', err);
      showToast('error', t.joinGroup.joinFailed);
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(221,132,60,0.12) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(144,85,160,0.10) 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-center">
          {loading ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 animate-pulse" />
              <div className="h-6 bg-secondary rounded-lg mx-auto mb-2 w-32 animate-pulse" />
              <div className="h-4 bg-secondary rounded-lg mx-auto w-48 animate-pulse" />
            </>
          ) : notFound ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-accent-bg flex items-center justify-center text-3xl mx-auto mb-4">
                ❌
              </div>
              <h1 className="text-xl font-black text-foreground mb-2">{t.joinGroup.notFound}</h1>
              <p className="text-sm text-muted-foreground mb-6">{t.joinGroup.notFoundDesc}</p>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-primary text-white rounded-xl py-3 font-bold active:scale-98 transition-transform"
              >
                {t.joinGroup.backHome}
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg shadow-primary/30">
                公
              </div>
              <h1 className="text-xl font-black text-foreground mb-1">{t.joinGroup.joinTitle}</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {t.joinGroup.invitedTo(groupName!)}
              </p>

              <div className="text-left mb-4">
                <label className="block text-xs text-muted-foreground mb-1.5">{t.joinGroup.yourName}</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder={t.joinGroup.namePlaceholder}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-subtle"
                  autoFocus
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={!name.trim() || isJoining}
                className="w-full bg-primary disabled:opacity-30 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-98 transition-transform"
              >
                {isJoining ? t.joinGroup.joining : t.joinGroup.joinButton}
              </button>

              <button
                onClick={() => navigate('/')}
                className="mt-3 w-full text-subtle text-sm py-2 active:opacity-70"
              >
                {t.joinGroup.backHome}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
