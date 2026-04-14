import React from 'react';
import { Shield, FileText, Lock, Eye, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { useNotification } from '../lib/NotificationContext';

const PolicyLayout = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest p-12 rounded-[48px] border border-outline-variant/10 shadow-2xl"
    >
      <div className="flex items-center gap-6 mb-12">
        <div className="bg-primary-fixed p-4 rounded-2xl">
          <Icon className="text-primary w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black tracking-tight">{title}</h1>
      </div>
      <div className="prose prose-slate max-w-none text-on-surface-variant space-y-8">
        {children}
      </div>
    </motion.div>
  </div>
);

export const TravelPolicyPage = () => (
  <PolicyLayout title="Travel Policy" icon={FileText}>
    <section>
      <h2 className="text-2xl font-bold text-on-surface mb-4">1. Boarding Requirements</h2>
      <p>Passengers must arrive at the terminal at least 30 minutes before the scheduled departure time. A valid digital or printed ticket and a government-issued ID are required for boarding.</p>
    </section>
    <section>
      <h2 className="text-2xl font-bold text-on-surface mb-4">2. Luggage Policy</h2>
      <p>Each passenger is entitled to one piece of hand luggage (max 5kg) and one piece of checked luggage (max 20kg). Excess luggage will attract additional charges based on weight and volume.</p>
    </section>
    <section>
      <h2 className="text-2xl font-bold text-on-surface mb-4">3. Cancellation & Refunds</h2>
      <p>Cancellations made 24 hours before departure are eligible for an 80% refund. No refunds will be issued for cancellations made within 12 hours of departure or for missed trips.</p>
    </section>
  </PolicyLayout>
);

export const HelpCenterPage = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [formData, setFormData] = React.useState({
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notify('Please login to submit a complaint', 'error');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'complaints'), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        subject: formData.subject,
        message: formData.message,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
      notify('Your complaint has been submitted successfully!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'complaints');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PolicyLayout title="Help Center" icon={Shield}>
      <section>
        <h2 className="text-2xl font-bold text-on-surface mb-4">Frequently Asked Questions</h2>
        <div className="space-y-6 mb-12">
          <div>
            <h3 className="font-bold text-primary mb-2">How do I book a seat?</h3>
            <p>Simply use the search widget on the home page, select your preferred bus, choose your seat, and pay via Mobile Money or Card.</p>
          </div>
          <div>
            <h3 className="font-bold text-primary mb-2">Can I change my seat after booking?</h3>
            <p>Currently, you must cancel your existing booking and make a new one to change your seat. Please refer to our refund policy.</p>
          </div>
          <div>
            <h3 className="font-bold text-primary mb-2">What if the bus is delayed?</h3>
            <p>We strive for punctuality. In case of significant delays, you will receive a WhatsApp/SMS notification with the updated departure time.</p>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10">
        <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-3">
          <MessageSquare className="text-primary w-6 h-6" /> Submit a Complaint
        </h2>
        
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-secondary text-on-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold mb-2">Complaint Received</h3>
            <p className="text-sm text-on-surface-variant mb-6">Our team will review your issue and respond shortly.</p>
            <button onClick={() => setSubmitted(false)} className="text-primary font-bold text-sm hover:underline">Submit another issue</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {!user && (
              <div className="p-4 bg-error-container/20 text-error rounded-2xl border border-error/10 text-sm font-bold">
                Please login to submit a formal complaint.
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-outline uppercase tracking-widest block mb-2">Subject</label>
              <input 
                type="text" required
                disabled={!user || loading}
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                className="w-full bg-surface p-4 rounded-2xl border border-outline-variant/10 focus:ring-2 ring-primary/20"
                placeholder="e.g. Delayed Departure, Seat Issue..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-outline uppercase tracking-widest block mb-2">Message</label>
              <textarea 
                required rows={4}
                disabled={!user || loading}
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="w-full bg-surface p-4 rounded-2xl border border-outline-variant/10 focus:ring-2 ring-primary/20 resize-none"
                placeholder="Describe your issue in detail..."
              />
            </div>
            <button 
              type="submit" 
              disabled={!user || loading}
              className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Complaint'}
              <Send className="w-5 h-5" />
            </button>
          </form>
        )}
      </section>
    </PolicyLayout>
  );
};

export const PrivacyPage = () => (
  <PolicyLayout title="Privacy Policy" icon={Eye}>
    <section>
      <h2 className="text-2xl font-bold text-on-surface mb-4">Data Collection</h2>
      <p>We collect your name, phone number, and email to facilitate bookings and provide trip updates. Your payment information is processed securely by our third-party providers and is never stored on our servers.</p>
    </section>
    <section>
      <h2 className="text-2xl font-bold text-on-surface mb-4">Data Usage</h2>
      <p>Your data is used solely for service delivery, security verification, and improving your travel experience with The Kinetic Ledger.</p>
    </section>
  </PolicyLayout>
);

export const TermsPage = () => (
  <PolicyLayout title="Terms of Service" icon={Lock}>
    <section>
      <h2 className="text-2xl font-bold text-on-surface mb-4">Agreement</h2>
      <p>By using The Kinetic Ledger, you agree to comply with our booking rules, safety regulations, and payment terms. We reserve the right to refuse service to anyone violating these terms.</p>
    </section>
    <section>
      <h2 className="text-2xl font-bold text-on-surface mb-4">Liability</h2>
      <p>The Kinetic Ledger is not liable for delays caused by traffic, weather, or mechanical issues, though we will make every effort to minimize disruptions.</p>
    </section>
  </PolicyLayout>
);
