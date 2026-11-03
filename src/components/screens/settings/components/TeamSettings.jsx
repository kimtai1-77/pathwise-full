import { useCallback, useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { BtnSecondary } from '../../../ui/buttons/btn-secondary.jsx';
import { supabase } from '../../../../lib/supabaseClient.js';

export function TeamSettings({ user, role }) {
  const isOwner = role === 'owner';
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('technician');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [removeSuccess, setRemoveSuccess] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [roleMember, setRoleMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState('Technician');
  const [roleSaveError, setRoleSaveError] = useState('');
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!inviteSuccess) return undefined;
    const timeoutId = window.setTimeout(() => setInviteSuccess(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [inviteSuccess]);

  useEffect(() => {
    if (!removeSuccess) return undefined;
    const timeoutId = window.setTimeout(() => setRemoveSuccess(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [removeSuccess]);

  const loadMembers = useCallback(async () => {
    if (!user?.id) return;

    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('msp_id')
      .eq('id', user.id)
      .single();

    if (currentProfileError || !currentProfile?.msp_id) {
      console.error('Could not load current MSP profile', currentProfileError);
      setMembersLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('msp_id', currentProfile.msp_id);

    if (error) {
      console.error('Could not load MSP profiles', error);
      setMembersLoading(false);
      return;
    }

    setMembers((data ?? []).map((profile) => ({
      id: profile.id,
      name: profile.full_name || profile.name || profile.email || 'Staff member',
      email: profile.email || '',
      role: profile.role === 'owner' ? 'Owner' : profile.role === 'msp_admin' ? 'Administrator' : profile.role === 'technician' ? 'Technician' : profile.role,
      status: profile.status || 'Active',
    })));
    setMembersLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;

    supabase
      .from('profiles')
      .select('msp_id')
      .eq('id', user.id)
      .single()
      .then(({ data: currentProfile, error: currentProfileError }) => {
        if (cancelled || currentProfileError || !currentProfile?.msp_id) {
          if (!cancelled && currentProfileError) {
            console.error('Could not load current MSP profile', currentProfileError);
          }
          return;
        }

        void supabase
          .from('profiles')
          .select('*')
          .eq('msp_id', currentProfile.msp_id)
          .then(({ data, error }) => {
            if (cancelled) return;
            if (error) {
              console.error('Could not load MSP profiles', error);
              setMembersLoading(false);
              return;
            }
            setMembers((data ?? []).map((profile) => ({
              id: profile.id,
              name: profile.full_name || profile.name || profile.email || 'Staff member',
              email: profile.email || '',
              role: profile.role === 'owner' ? 'Owner' : profile.role === 'msp_admin' ? 'Administrator' : profile.role === 'technician' ? 'Technician' : profile.role,
              status: profile.status || 'Active',
            })));
            setMembersLoading(false);
          });
      });

    return () => { cancelled = true; };
  }, [user]);

  async function saveRole() {
    const databaseRole = selectedRole === 'Administrator' ? 'msp_admin' : 'technician';
    const { error } = await supabase
      .from('profiles')
      .update({ role: databaseRole })
      .eq('id', roleMember.id);

    if (error) {
      console.error('Could not update team member role', error);
      setRoleSaveError(error.message || 'Could not update the role.');
      return;
    }

    setMembers((currentMembers) => currentMembers.map((member) => (
      member.id === roleMember.id ? { ...member, role: selectedRole } : member
    )));
    setRoleSaveError('');
    setRoleMember(null);
  }

  async function sendInvite(event) {
    event.preventDefault();
    setInviteBusy(true);
    setInviteMessage('');

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setInviteMessage('Your session has expired. Please sign in again before sending an invitation.');
        return;
      }

      const { error } = await supabase.functions.invoke('send-invitation', {
        body: { email: inviteEmail.trim(), role: inviteRole },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        let message = error.message;
        if (error instanceof FunctionsHttpError) {
          const result = await error.context.json().catch(() => null);
          message = result?.error ?? message;
        }
        setInviteMessage(message);
        return;
      }

      setInviteMessage('');
      setInviteEmail('');
      setInviteOpen(false);
      setInviteSuccess(true);
      await loadMembers();
    } catch (error) {
      setInviteMessage(error instanceof Error ? error.message : 'Could not send invitation.');
    } finally {
      setInviteBusy(false);
    }
  }

  function closeInvite() {
    if (!inviteBusy) setInviteOpen(false);
  }

  async function confirmRemoveMember() {
    if (!memberToRemove) return;

    setIsRemovingMember(true);
    setRemoveError('');

    const { data: deletedProfiles, error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', memberToRemove.id)
      .select('id');

    setIsRemovingMember(false);

    if (error) {
      console.error('Could not remove team member profile', error);
      setRemoveError(error.message || 'Could not remove this user. Please try again.');
      return;
    }

    if (!deletedProfiles?.length) {
      setRemoveError('Supabase did not remove this profile. Check the owner role and DELETE policy.');
      return;
    }

    setMemberToRemove(null);
    await loadMembers();
    setRemoveSuccess(true);
  }

  return (
    <section className={`owner-settings-panel${isOwner ? '' : ' is-msp-admin-team'}`}>
      <div className="owner-settings-panel-heading">
        <div>
          <h3>Team</h3>
          <p>Invite staff and manage their access to this organisation.</p>
        </div>
        <button className="profile-settings-submit" type="button" onClick={() => setInviteOpen(true)}>Invite staff</button>
      </div>

      <div className="owner-settings-table" role="table" aria-label="Team members">
        <div className="owner-settings-table-row owner-settings-table-head" role="row">
          <span>Name</span><span>Role</span><span>Status</span><span aria-hidden="true" />
        </div>
        {members.map((member) => (
          <div className="owner-settings-table-row" role="row" key={member.email || member.name}>
            <span><strong>{member.name}</strong><small>{member.email}</small></span>
            <span>{member.role}</span>
            <span><span className={`owner-settings-status is-${member.status.toLowerCase()}`}>{member.status}</span></span>
            <span className="owner-settings-actions">
              {isOwner && member.role !== 'Owner' && (
                <>
                  <BtnSecondary
                    className="team-member-action"
                    type="button"
                    onClick={() => {
                      setRoleMember(member);
                      setSelectedRole(member.role);
                    }}
                  >
                    Change role
                  </BtnSecondary>
                  <BtnSecondary
                    className="team-member-action"
                    type="button"
                    onClick={() => {
                      setRemoveError('');
                      setMemberToRemove(member);
                    }}
                  >
                    Remove
                  </BtnSecondary>
                </>
              )}
            </span>
          </div>
        ))}
      </div>

      {membersLoading ? (
        <p className="owner-settings-empty" role="status">Loading staff members...</p>
      ) : members.length === 0 && (
        <p className="owner-settings-empty">No staff members yet.</p>
      )}

      {inviteSuccess && (
        <div className="team-success-toast" role="status" aria-live="polite">
          Invitation sent
        </div>
      )}

      {removeSuccess && (
        <div className="team-success-toast" role="status" aria-live="polite">
          User removed
        </div>
      )}

      {memberToRemove && (
        <div className="owner-settings-dialog-card team-remove-confirmation" role="dialog" aria-modal="true" aria-label="Remove team member">
          <div><strong>Remove team member</strong></div>
          <p>Remove {memberToRemove.name} from this MSP?</p>
          {removeError && <p className="team-remove-error" role="alert">{removeError}</p>}
          <div className="team-remove-actions">
            <BtnSecondary type="button" disabled={isRemovingMember} onClick={() => setMemberToRemove(null)}>Cancel</BtnSecondary>
            <BtnSecondary type="button" disabled={isRemovingMember} onClick={confirmRemoveMember}>
              {isRemovingMember ? <span className="team-remove-loader" aria-label="Removing user" /> : 'OK'}
            </BtnSecondary>
          </div>
        </div>
      )}

      {inviteOpen && (
        <form className="owner-settings-dialog-card invite-staff-dialog" role="dialog" aria-label="Invite staff" onSubmit={sendInvite}>
          <div><strong>Invite staff</strong><button type="button" aria-label="Close" onClick={closeInvite}>×</button></div>
          <label>
            Email address
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
          </label>
          <div className="invite-role-field">
            <span>Role</span>
            {isOwner ? (
              <span className="owner-settings-select">
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                  <option value="msp_admin">Administrator</option>
                  <option value="technician">Technician</option>
                </select>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
              </span>
            ) : (
              <strong className="invite-role-readonly">Technician</strong>
            )}
          </div>
          <button className="profile-settings-submit" type="submit" disabled={inviteBusy}>
            {inviteBusy ? 'Sending…' : 'Send invite'}
          </button>
          {inviteMessage && <p role="status">{inviteMessage}</p>}
        </form>
      )}

      {roleMember && (
        <div className="owner-settings-dialog-card" role="dialog" aria-label="Change role">
          <div><strong>Change role</strong><button type="button" aria-label="Close" onClick={() => setRoleMember(null)}>×</button></div>
          <p>{roleMember.name}</p>
          <label>
            Role
            <span className="owner-settings-select">
              <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                <option>Administrator</option>
                <option>Technician</option>
              </select>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
            </span>
          </label>
          {roleSaveError && <p role="alert">{roleSaveError}</p>}
          <button className="profile-settings-submit" type="button" onClick={saveRole}>Save role</button>
        </div>
      )}
    </section>
  );
}
