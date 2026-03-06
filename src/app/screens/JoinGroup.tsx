import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, ensureAuth } from '../firebase';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { useAppPaths } from '../routing/appPaths';

const MEMBER_COLORS = ['#DD843C','#C05A5A','#72A857','#5A7EC5','#C8914A','#9055A0','#5AABAB','#BD7A5A'];

function getInitials(name: string) {
  if (!name) return '?';
  const c = name.trim();
  return c.length === 1 ? c : c[0].toUpperCase();
}

type ExistingMember = { id: string; name: string; initials: string; color: string };

export function JoinGroup() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { appPath, entryPath } = useAppPaths();
  const { joinGroup, enterGroup, showToast } = useApp();
  const { t } = useT();

  const [groupName, setGroupName] = useState<string | null>(null);
  const [existingMembers, setExistingMembers] = useState<ExistingMember[]>([]);
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
          const membersSnap = await getDocs(collection(db, 'groups', groupId!, 'members'));
          setExistingMembers(membersSnap.docs.map(d => ({
            id: d.id,
            name: d.data().name,
            initials: d.data().initials,
            color: d.data().color,
          })));
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

  async function handleClaimMember() {
    if (!groupId || isJoining) return;
    setIsJoining(true);
    try {
      await enterGroup(groupId);
      showToast('success', t.joinGroup.joinSuccess);
      navigate(appPath('/dashboard'));
    } catch (err) {
      console.error('Failed to enter group:', err);
      showToast('error', t.joinGroup.joinFailed);
    } finally {
      setIsJoining(false);
    }
  }

  async function handleJoin() {
    if (!name.trim() || !groupId || isJoining) return;
    setIsJoining(true);
    try {
      const color = MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
      await joinGroup(groupId, {
        id: Date.now().toString(),
        name: name.trim(),
        initials: getInitials(name),
        color,
        role: 'member' as const,
      });
      showToast('success', t.joinGroup.joinSuccess);
      navigate(appPath('/dashboard'));
    } catch (err) {
      console.error('Failed to join group:', err);
      showToast('error', t.joinGroup.joinFailed);
    } finally {
      setIsJoining(false);
    }
  }

  async function handleViewOnly() {
    if (!groupId || isJoining) return;
    setIsJoining(true);
    try {
      await enterGroup(groupId);
      showToast('success', t.joinGroup.viewOnlySuccess);
      navigate(appPath('/dashboard'));
    } catch (err) {
      console.error('Failed to enter group:', err);
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
              <div className="w-16 h-16 rounded-2xl bg-accent-bg flex items-center justify-center text-3xl mx-auto mb-4">❌</div>
              <h1 className="text-xl font-black text-foreground mb-2">{t.joinGroup.notFound}</h1>
              <p className="text-sm text-muted-foreground mb-6">{t.joinGroup.notFoundDesc}</p>
              <button
                onClick={() => navigate(entryPath())}
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
              <p className="text-sm text-muted-foreground mb-6">{t.joinGroup.invitedTo(groupName!)}</p>

              {/* Existing members: "你係邊位？" */}
              {existingMembers.length > 0 && (
                <div className="mb-5 text-left">
                  <p className="text-xs font-bold text-muted-foreground mb-2">{t.joinGroup.whoAreYou}</p>
                  <div className="flex flex-wrap gap-2">
                    {existingMembers.map(m => (
                      <button
                        key={m.id}
                        onClick={handleClaimMember}
                        disabled={isJoining}
                        className="flex items-center gap-1.5 bg-secondary border border-border hover:border-primary rounded-full px-2.5 py-1.5 transition-colors active:scale-95"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: m.color }}
                        >
                          {m.initials}
                        </div>
                        <span className="text-sm text-foreground">{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {existingMembers.length > 0 && (
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-subtle">{t.joinGroup.orSeparator}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* New member input */}
              <div className="text-left mb-4">
                <label className="block text-xs text-muted-foreground mb-1.5">{t.joinGroup.joinAsNew}</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder={t.joinGroup.namePlaceholder}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-subtle"
                  autoFocus={existingMembers.length === 0}
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={!name.trim() || isJoining}
                className="w-full bg-primary disabled:opacity-30 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-98 transition-transform mb-3"
              >
                {isJoining ? t.joinGroup.joining : t.joinGroup.joinButton}
              </button>

              <button
                onClick={handleViewOnly}
                disabled={isJoining}
                className="w-full text-subtle text-sm py-2 active:opacity-70"
              >
                {t.joinGroup.viewOnly}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
