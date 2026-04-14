import { useState } from 'react';
import { Mail, Phone, MessageSquare, FileText, Shield, ExternalLink } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const SUPPORT_CONTACTS = [
  {
    icon: Mail,
    label: 'Email Support',
    value: 'support@ehsos.kaec',
    description: 'For general inquiries and technical assistance',
    color: 'bg-primary-50 text-primary-600',
  },
  {
    icon: Phone,
    label: 'Phone Support',
    value: '+966 12 000 0000',
    description: 'Available during business hours (Sun\u2013Thu, 8AM\u20135PM)',
    color: 'bg-success-50 text-success-600',
  },
  {
    icon: MessageSquare,
    label: 'Report an Issue',
    value: 'Submit a detailed report',
    description: 'Report bugs, errors, or unexpected behavior',
    color: 'bg-warning-50 text-warning-600',
  },
];

const HELP_TOPICS = [
  {
    icon: Shield,
    title: 'Permissions & Access',
    description: 'If you cannot access a module or feature, your administrator needs to grant the relevant permission to your role. Contact your system administrator or EHS Manager.',
  },
  {
    icon: FileText,
    title: 'Using Modules',
    description: 'Each module (Observations, Permits, Training, etc.) is accessible from the sidebar when enabled. Use the dashboard for a quick overview of your key metrics.',
  },
  {
    icon: ExternalLink,
    title: 'Password & Account',
    description: 'You can change your password and update your profile from the "My Profile" page accessible via the profile dropdown in the top-right corner.',
  },
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Minor inconvenience, workaround available' },
  { value: 'medium', label: 'Medium', description: 'Feature not working as expected' },
  { value: 'high', label: 'High', description: 'Blocking issue, no workaround' },
  { value: 'critical', label: 'Critical', description: 'System down or data loss risk' },
];

export default function HelpSupportPage() {
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ subject: '', description: '', severity: 'medium' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  const resetIssueForm = () => {
    setIssueForm({ subject: '', description: '', severity: 'medium' });
  };

  const handleCloseIssueModal = () => {
    setShowIssueModal(false);
    resetIssueForm();
  };

  const handleReportIssue = async () => {
    if (!issueForm.description.trim()) {
      toast.error('Please provide a description of the issue.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/support/report-issue', {
        subject: issueForm.subject.trim() || 'Issue Report',
        description: issueForm.description.trim(),
        severity: issueForm.severity,
        reporter_name: user?.name,
        reporter_email: user?.email,
      });
      toast.success('Issue reported successfully. Our team will review it shortly.');
      handleCloseIssueModal();
    } catch {
      // Backend endpoint may not exist yet -- fall back to mailto
      const subject = encodeURIComponent(issueForm.subject.trim() || 'EHS-OS Issue Report');
      const body = encodeURIComponent(
        `Severity: ${issueForm.severity}\nReported by: ${user?.name ?? 'Unknown'} (${user?.email ?? ''})\n\n${issueForm.description}`
      );
      window.open(`mailto:support@ehsos.kaec?subject=${subject}&body=${body}`, '_blank');
      toast.info('Opening your email client to send the report.');
      handleCloseIssueModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactClick = (label: string) => {
    if (label === 'Report an Issue') {
      setShowIssueModal(true);
    } else if (label === 'Email Support') {
      window.open('mailto:support@ehsos.kaec', '_blank');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-text-primary">Help & Support</h1>
        <p className="text-[13px] text-text-tertiary mt-1">Get help with EHS\u00b7OS or reach out to our support team.</p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SUPPORT_CONTACTS.map((contact) => {
          const Icon = contact.icon;
          return (
            <button
              key={contact.label}
              onClick={() => handleContactClick(contact.label)}
              className="bg-white rounded-[var(--radius-lg)] border border-border shadow-xs p-5 hover:shadow-md transition-all text-left cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center ${contact.color} mb-3`}>
                <Icon size={18} />
              </div>
              <h3 className="text-[14px] font-semibold text-text-primary mb-0.5">{contact.label}</h3>
              <p className="text-[13px] font-medium text-primary-600 mb-1.5">{contact.value}</p>
              <p className="text-[11px] text-text-tertiary leading-relaxed">{contact.description}</p>
            </button>
          );
        })}
      </div>

      {/* Help Topics */}
      <div className="bg-white rounded-[var(--radius-lg)] border border-border shadow-xs">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text-primary">Common Topics</h2>
          <p className="text-[12px] text-text-tertiary mt-0.5">Quick answers to frequently asked questions</p>
        </div>
        <div className="divide-y divide-border">
          {HELP_TOPICS.map((topic) => {
            const Icon = topic.icon;
            return (
              <div key={topic.title} className="px-4 sm:px-6 py-4 flex gap-4">
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-surface-sunken flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-text-secondary" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-text-primary mb-1">{topic.title}</h3>
                  <p className="text-[13px] text-text-secondary leading-relaxed">{topic.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-surface-sunken rounded-[var(--radius-lg)] p-4 sm:p-5 text-center">
        <p className="text-[12px] text-text-tertiary">
          EHS\u00b7OS \u2014 KAEC Rail Project \u00b7 Version 1.0
        </p>
        <p className="text-[11px] text-text-tertiary mt-1">
          For urgent safety concerns, always follow your site's emergency procedures first.
        </p>
      </div>

      {/* Report an Issue Modal */}
      <Modal
        open={showIssueModal}
        onClose={handleCloseIssueModal}
        title="Report an Issue"
        subtitle="Describe the problem you encountered and we'll look into it."
        size="md"
        footer={
          <>
            <button
              onClick={handleCloseIssueModal}
              className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReportIssue}
              disabled={isSubmitting || !issueForm.description.trim()}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">Subject</label>
            <input
              type="text"
              value={issueForm.subject}
              onChange={e => setIssueForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Brief summary of the issue"
              className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">Severity</label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIssueForm(f => ({ ...f, severity: opt.value }))}
                  className={`px-3 py-2 text-left border rounded-[var(--radius-md)] transition-all ${
                    issueForm.severity === opt.value
                      ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200'
                      : 'border-border hover:bg-surface-sunken'
                  }`}
                >
                  <span className="block text-[13px] font-medium text-text-primary">{opt.label}</span>
                  <span className="block text-[11px] text-text-tertiary mt-0.5">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">
              Description <span className="text-danger-500">*</span>
            </label>
            <textarea
              value={issueForm.description}
              onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe what happened, what you expected, and any steps to reproduce the issue..."
              rows={5}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors resize-vertical"
            />
          </div>

          {/* Reporter Info */}
          {user && (
            <div className="bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">
              <p className="text-[11px] text-text-tertiary">
                Reporting as <span className="font-medium text-text-secondary">{user.name}</span> ({user.email})
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
