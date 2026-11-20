import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Role, UserStatus, type User } from '@clm/shared-types';
import { StatusBadge, Modal, toast } from '@clm/ui';
import { api } from '../../../config/api';

interface TeamRbacProps {
  members: User[];
  onMembersUpdated: () => void;
}

export const TeamRbac: React.FC<TeamRbacProps> = ({
  members,
  onMembersUpdated,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>(Role.DEVOPS_ENGINEER);
  const [invitePassword, setInvitePassword] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    try {
      await api.users.updateRole(userId, newRole);
      toast.success('Role Updated', 'Member RBAC permissions updated.');
      onMembersUpdated();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update role.');
    }
  };

  const handleToggleMemberStatus = async (userId: string) => {
    try {
      const member = members.find((m) => m.id === userId);
      const newStatus =
        member?.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
      await api.users.updateStatus(userId, newStatus);
      toast.success('Status Updated', 'Member status updated successfully.');
      onMembersUpdated();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not toggle member status.');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
        const res: any = await api.users.invite({
          email: inviteEmail.trim(),
          firstName: inviteFirstName.trim() || 'Team',
          lastName: inviteLastName.trim() || 'Member',
          role: inviteRole,
          password: invitePassword.trim() || undefined,
        });
        const generatedPass = invitePassword.trim() || res?.temporaryPassword;
        setShowInviteModal(false);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
        setInvitePassword('');
      if(generatedPass) {
          toast.success(
            'Member Created Successfully',
            `Created ${inviteEmail} as ${inviteRole}. Initial password: ${generatedPass}`
          );
        } else {
          toast.success('Member Created', `Created ${inviteEmail} as ${inviteRole}.`);
        }
      onMembersUpdated();
      } catch (err: any) {
        toast.error('Invite Failed', err.message || 'Could not send invitation.');
      } finally {
        setIsInviting(false);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
              Invited Employees &amp; Role Privileges
            </h4>
            <p className="text-[11px] text-slate-400">
              Granular RBAC role delegation with Argon2id password hash protection.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="primary-gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Work Email</th>
                <th className="py-3 px-4">Role Privileges</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No members found in this workspace. Click "Invite Member" to add team members.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{member.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value as Role)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-[#F8FAFC] focus:outline-none focus:border-blue-600 cursor-pointer"
                      >
                        <option value={Role.TENANT_ADMIN}>Tenant Admin (Full Access)</option>
                        <option value={Role.SECURITY_LEAD}>Security Lead (Issuance/Revoke)</option>
                        <option value={Role.DEVOPS_ENGINEER}>DevOps Engineer (Deploy &amp; Gateways)</option>
                        <option value={Role.AUDITOR}>Auditor (Read &amp; Compliance)</option>
                        <option value={Role.READ_ONLY}>Read Only</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        variant={member.status === UserStatus.ACTIVE ? 'healthy' : 'warning'}
                        label={member.status}
                      />
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleMemberStatus(member.id)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${member.status === UserStatus.ACTIVE
                            ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          }`}
                      >
                        {member.status === UserStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Invite Member Modal */}
        <Modal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          title="Invite Team Member"
          description="Add a coworker to your tenant organization with customized RBAC privileges."
          maxWidth="md"
        >
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Work Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. devops@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="Jane"
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-medium"
              >
                <option value={Role.TENANT_ADMIN}>Tenant Admin (Full Control)</option>
                <option value={Role.SECURITY_LEAD}>Security Lead (PKI &amp; Revocation)</option>
                <option value={Role.DEVOPS_ENGINEER}>DevOps Engineer (Deploy &amp; Gateways)</option>
                <option value={Role.AUDITOR}>Auditor (Read &amp; Export Only)</option>
                <option value={Role.READ_ONLY}>Read Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Initial Password (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Password123! (leave blank to auto-generate)"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                If omitted, a random 12-character secure temporary password will be auto-generated.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
              >
                {isInviting ? 'Sending Invite...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  };
