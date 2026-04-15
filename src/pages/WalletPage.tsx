import React from 'react';
import { 
  Wallet, 
  Plus, 
  Send, 
  Zap, 
  RefreshCcw, 
  Smartphone, 
  Wifi, 
  ShieldCheck, 
  XCircle, 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useNotification } from '../lib/NotificationContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  setDoc,
  addDoc, 
  increment, 
  serverTimestamp, 
  getDocs 
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Transaction } from '../types';
import { cn } from '../lib/utils';
import axios from 'axios';

export const WalletPage = () => {
  const { user, profile } = useAuth();
  const { notify } = useNotification();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [action, setAction] = React.useState<'topup' | 'send' | 'airtime' | 'data' | 'utilities' | null>(null);
  const [amount, setAmount] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [recipient, setRecipient] = React.useState('');
  const [selectedPackage, setSelectedPackage] = React.useState<any>(null);
  const [processing, setProcessing] = React.useState(false);
  const [showResetPinModal, setShowResetPinModal] = React.useState(false);
  const [newPin, setNewPin] = React.useState('');
  const [confirmNewPin, setConfirmNewPin] = React.useState('');
  const [incomingSms, setIncomingSms] = React.useState<{ message: string; sender: string } | null>(null);
  const [isWaitingForPin, setIsWaitingForPin] = React.useState(false);
  const [pendingTxRef, setPendingTxRef] = React.useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = React.useState<'idle' | 'polling' | 'success' | 'failed'>('idle');

  const DATA_PACKAGES = [
    { id: 'd1', name: '500MB Daily', price: 2000, volume: '500MB' },
    { id: 'd2', name: '1.5GB Weekly', price: 10000, volume: '1.5GB' },
    { id: 'd3', name: '5GB Monthly', price: 30000, volume: '5GB' },
    { id: 'd4', name: '15GB Monthly', price: 50000, volume: '15GB' },
  ];

  const UTILITIES = [
    { id: 'u1', name: 'Umeme Yaka', icon: '⚡', placeholder: 'Enter 11-digit Meter Number', example: 'e.g. 042XXXXXXXX' },
    { id: 'u2', name: 'NWSC Water', icon: '💧', placeholder: 'Enter 10-digit Customer Ref', example: 'e.g. 1234567890' },
    { id: 'u3', name: 'DSTV/GOTV', icon: '📺', placeholder: 'Enter 10-digit IUC Number', example: 'e.g. 20XXXXXXXX' },
    { id: 'u4', name: 'Startimes', icon: '📡', placeholder: 'Enter Smart Card Number', example: 'e.g. 01XXXXXXXX' },
  ];

  React.useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    return () => unsub();
  }, [user]);

  React.useEffect(() => {
    let interval: any;
    if (isWaitingForPin && pendingTxRef && pollingStatus === 'polling') {
      console.log('Starting polling for txRef:', pendingTxRef);
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`/api/wallet/status/${pendingTxRef}`);
          console.log('Polling status:', res.data.status);
          if (res.data.status === 'success') {
            clearInterval(interval);
            
            // Finalize Top-up in Firestore
            const txAmount = parseInt(amount);
            console.log('Finalizing top-up of amount:', txAmount);
            
            if (isNaN(txAmount) || txAmount <= 0) {
              console.error('Invalid top-up amount:', amount);
              setPollingStatus('failed');
              return;
            }

            const userRef = doc(db, 'users', user!.uid);
            
            try {
              // Use setDoc with merge: true to be more robust than updateDoc
              await setDoc(userRef, { 
                walletBalance: increment(txAmount) 
              }, { merge: true });
              console.log('Wallet balance updated');
              
              await addDoc(collection(db, 'transactions'), {
                userId: user!.uid,
                amount: txAmount,
                type: 'topup',
                description: `Wallet Top-up via Mobile Money`,
                createdAt: serverTimestamp()
              });
              console.log('Transaction record created');

              setPollingStatus('success');
              notify('Wallet topped up successfully!', 'success');
              
              // Wait a bit to show success screen before closing
              setTimeout(() => {
                setIsWaitingForPin(false);
                setPendingTxRef(null);
                setPollingStatus('idle');
                setShowModal(false);
                resetForm();
              }, 4000);
            } catch (err) {
              console.error('Firestore update failed during top-up:', err);
              setPollingStatus('failed');
              handleFirestoreError(err, OperationType.UPDATE, `users/${user!.uid}`);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
    }
    return () => {
      if (interval) {
        console.log('Cleaning up polling interval');
        clearInterval(interval);
      }
    };
  }, [isWaitingForPin, pendingTxRef, pollingStatus, user, amount, notify]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !action || isWaitingForPin || processing) return;

    const txAmount = action === 'data' ? selectedPackage?.price : parseInt(amount);
    if (!txAmount || isNaN(txAmount) || txAmount <= 0) {
      if (action !== 'data') {
        notify('Please enter a valid amount', 'error');
        return;
      }
    }

    if (action !== 'topup' && pin !== (profile?.walletPin || '0000')) {
      notify('Incorrect Wallet PIN', 'error');
      return;
    }

    setProcessing(true);
    try {
      // Call Backend API
      const response = await axios.post('/api/wallet/process', {
        userId: user.uid,
        action,
        amount: txAmount,
        phone: action === 'send' ? recipient : phone,
        packageId: selectedPackage?.id,
        packageName: selectedPackage?.name
      });

      if (response.data.status === 'success') {
        // Update Firestore based on action
        const userRef = doc(db, 'users', user.uid);
        if (action === 'send') {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('phoneNumber', '==', recipient));
          const querySnap = await getDocs(q);
          
          if (querySnap.empty) {
            notify('Recipient not found.', 'error');
            setProcessing(false);
            return;
          }
          
          const recipientId = querySnap.docs[0].id;
          const recipientRef = doc(db, 'users', recipientId);
          
          try {
            await updateDoc(userRef, { walletBalance: increment(-txAmount) });
            await updateDoc(recipientRef, { walletBalance: increment(txAmount) });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, 'users (transfer)');
          }

          try {
            await addDoc(collection(db, 'transactions'), {
              userId: user.uid,
              amount: -txAmount,
              type: 'payment',
              description: `Sent money to ${recipient}`,
              createdAt: serverTimestamp()
            });
            await addDoc(collection(db, 'transactions'), {
              userId: recipientId,
              amount: txAmount,
              type: 'refund',
              description: `Received money from ${profile?.displayName || user.email}`,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'transactions (transfer)');
          }
        } else {
          try {
            await updateDoc(userRef, { walletBalance: increment(-txAmount) });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
          }

          let desc = `Purchased ${action} for ${phone}`;
          if (action === 'data') desc = `Purchased ${selectedPackage.name} for ${phone}`;
          if (action === 'utilities') desc = `Paid ${selectedPackage.name} for Account ${phone}`;

          try {
            await addDoc(collection(db, 'transactions'), {
              userId: user.uid,
              amount: -txAmount,
              type: action,
              description: desc,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'transactions');
          }
        }

        notify(response.data.message, 'success');
        
        // Simulate Real-time Phone Notification
        let smsMsg = '';
        if (action === 'send') smsMsg = `Kinetic: You have sent ${txAmount} UGX to ${recipient}. Ref: ${Math.random().toString(36).substring(7).toUpperCase()}`;
        else smsMsg = `Kinetic: Transaction of ${txAmount} UGX for ${action} successful.`;

        setIncomingSms({ message: smsMsg, sender: 'Kinetic' });
        setTimeout(() => setIncomingSms(null), 8000);

        setShowModal(false);
        resetForm();
      } else if (response.data.status === 'pending') {
        setIsWaitingForPin(true);
        setPendingTxRef(response.data.txRef);
        setPollingStatus('polling');
        notify(response.data.message, 'info');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          (typeof err.response?.data === 'string' ? err.response.data : null) || 
                          err.message || 
                          'Transaction failed';
      notify(errorMessage, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPin.length !== 4 || isNaN(parseInt(newPin))) {
      notify('PIN must be 4 digits', 'error');
      return;
    }
    if (newPin !== confirmNewPin) {
      notify('PINs do not match', 'error');
      return;
    }

    setProcessing(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { walletPin: newPin });
      notify('Wallet PIN updated successfully', 'success');
      setShowResetPinModal(false);
      setNewPin('');
      setConfirmNewPin('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setAction(null);
    setAmount('');
    setPhone('');
    setPin('');
    setRecipient('');
    setSelectedPackage(null);
    setIsWaitingForPin(false);
    setPendingTxRef(null);
    setPollingStatus('idle');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCcw className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-24 px-4 md:px-6 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12"
      >
        {/* Wallet Balance Card */}
        <div className="lg:col-span-1">
          <div className="bg-on-surface text-surface p-5 md:p-10 rounded-[24px] md:rounded-[48px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12">
                <div className="bg-surface/20 p-2 md:p-3 rounded-xl md:rounded-2xl backdrop-blur-md">
                  <Wallet className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] opacity-60">Kinetic Wallet</span>
              </div>
              <p className="text-xs md:text-sm font-bold opacity-60 mb-1 md:mb-2">Available Balance</p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-8 md:mb-12">
                {(profile?.walletBalance || 0).toLocaleString()} <span className="text-lg md:text-xl opacity-60">UGX</span>
              </h2>
              <div className="flex gap-2 md:gap-4 mb-4">
                <button 
                  onClick={() => { setAction('topup'); setShowModal(true); }}
                  className="flex-1 bg-primary text-on-primary py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-primary-container transition-all"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" /> Top Up
                </button>
                <button 
                  onClick={() => { setAction('send'); setShowModal(true); }}
                  className="flex-1 bg-surface/10 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-surface/20 transition-all backdrop-blur-md"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" /> Send
                </button>
              </div>
              <button 
                onClick={() => setShowResetPinModal(true)}
                className="w-full bg-surface/5 py-3 rounded-xl text-xs font-bold hover:bg-surface/10 transition-all border border-surface/10"
              >
                Reset Wallet PIN
              </button>
            </div>
          </div>

          <div className="mt-8 p-8 bg-surface-container-low rounded-[40px] border border-outline-variant/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Security Tip
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              Never share your 4-digit Wallet PIN with anyone. Kinetic Ledger staff will never ask for your PIN.
            </p>
            <a 
              href="https://wa.me/256703261600" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366]/10 text-[#25D366] rounded-2xl font-bold hover:bg-[#25D366]/20 transition-all"
            >
              <MessageSquare className="w-5 h-5" /> Chat with Support
            </a>
          </div>
        </div>

        {/* Action Grid & History */}
        <div className="lg:col-span-2 space-y-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6">
            {[
              { id: 'airtime', label: 'Airtime', icon: Smartphone, color: 'bg-secondary-container text-secondary' },
              { id: 'data', label: 'Data Bundles', icon: Wifi, color: 'bg-primary-fixed text-primary' },
              { id: 'utilities', label: 'Utilities', icon: Zap, color: 'bg-surface-container-highest text-on-surface' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => { setAction(item.id as any); setShowModal(true); }}
                className="bg-surface-container-low p-4 md:p-8 rounded-2xl md:rounded-[40px] border border-outline-variant/10 hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-2 md:gap-4 group"
              >
                <div className={cn("p-4 md:p-5 rounded-2xl md:rounded-3xl transition-transform group-hover:scale-110", item.color)}>
                  <item.icon className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <span className="font-bold text-xs md:text-sm">{item.label}</span>
              </button>
            ))}
          </div>

          {/* History */}
          <div>
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 md:gap-4">
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-primary" /> History
              </h2>
            </div>
            {transactions.length === 0 ? (
              <div className="bg-surface-container-low p-8 md:p-12 rounded-3xl md:rounded-[40px] text-center border border-outline-variant/10">
                <RefreshCcw className="w-10 h-10 md:w-12 md:h-12 text-outline mx-auto mb-4 opacity-20" />
                <p className="text-sm md:text-on-surface-variant font-bold">No transactions yet.</p>
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-3xl md:rounded-[40px] border border-outline-variant/10 overflow-hidden">
                <div className="divide-y divide-outline-variant/10">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-surface-container-lowest transition-colors">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={cn(
                          "p-2 md:p-3 rounded-lg md:rounded-xl",
                          tx.amount > 0 ? "bg-primary-fixed text-primary" : "bg-error-container text-error"
                        )}>
                          {tx.amount > 0 ? <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" /> : <ArrowDownLeft className="w-4 h-4 md:w-5 md:h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-xs md:text-sm text-on-surface">{tx.description}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-outline uppercase tracking-widest mt-0.5">
                            {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd • HH:mm') : 'Just now'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-sm md:text-lg font-black",
                          tx.amount > 0 ? "text-primary" : "text-error"
                        )}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} <span className="text-[10px]">UGX</span>
                        </p>
                        <p className="text-[9px] md:text-[10px] font-bold text-outline uppercase tracking-widest">{tx.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Action Modal */}
      <AnimatePresence>
        {showModal && action && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowModal(false); resetForm(); }}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-surface p-10 rounded-[48px] shadow-2xl max-w-md w-full border border-outline-variant/10 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black tracking-tight capitalize">{action.replace('-', ' ')}</h2>
                <button onClick={() => { resetForm(); setShowModal(false); }} className="p-2 bg-surface-container-low rounded-xl hover:bg-error-container hover:text-error transition-all">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {isWaitingForPin ? (
                <div className="text-center py-8">
                  <AnimatePresence mode="wait">
                    {pollingStatus === 'polling' ? (
                      <motion.div 
                        key="polling"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <div className="relative w-24 h-24 mx-auto">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Smartphone className="w-10 h-10 text-primary animate-pulse" />
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h2 className="text-3xl font-black tracking-tight">Check Your Phone</h2>
                          <p className="text-on-surface-variant font-medium leading-relaxed">
                            We've sent a secure PIN prompt to <span className="text-primary font-bold">{phone}</span>.
                            Please enter your Mobile Money PIN to authorize the <span className="font-bold text-on-surface">{amount} UGX</span> top-up.
                          </p>
                        </div>

                        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-outline uppercase tracking-widest">Status</p>
                            <p className="text-sm font-bold animate-pulse">Waiting for PIN entry...</p>
                          </div>
                        </div>

                        <p className="text-[10px] text-outline italic">
                          Ref: {pendingTxRef} • Do not close this screen
                        </p>
                        
                        <button 
                          onClick={() => { setIsWaitingForPin(false); setPendingTxRef(null); setPollingStatus('idle'); }}
                          className="text-xs font-bold text-error hover:underline"
                        >
                          Cancel Transaction
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                      >
                        <div className="w-24 h-24 bg-primary rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-primary/40">
                          <CheckCircle2 className="w-12 h-12 text-on-primary" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-3xl font-black tracking-tight">Payment Confirmed!</h2>
                          <p className="text-on-surface-variant font-medium">
                            Your wallet has been credited with <span className="text-primary font-bold">{amount} UGX</span>.
                          </p>
                        </div>
                        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-outline">Transaction ID</span>
                            <span className="text-sm font-mono font-bold">TXN-{Math.random().toString(36).substring(7).toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-outline">New Balance</span>
                            <span className="text-sm font-bold text-primary">{( (profile?.walletBalance || 0) + parseInt(amount) ).toLocaleString()} UGX</span>
                          </div>
                        </div>
                        <p className="text-xs text-outline font-medium">Closing in a few seconds...</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <form onSubmit={handleAction} className="space-y-6">
                {action === 'send' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Recipient Phone Number</label>
                    <input 
                      type="tel" required
                      placeholder="e.g. 0770000000"
                      value={recipient}
                      onChange={e => setRecipient(e.target.value)}
                      className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold"
                    />
                  </div>
                )}

                {(action === 'topup' || action === 'airtime' || action === 'utilities') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">
                      {action === 'topup' ? 'Mobile Money Number' : action === 'utilities' ? (selectedPackage?.placeholder || 'Account Number') : 'Phone Number'}
                    </label>
                    <input 
                      type="tel" required
                      placeholder={action === 'utilities' ? selectedPackage?.example : "e.g. 0770000000"}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold"
                    />
                  </div>
                )}

                {action === 'data' && (
                  <div className="space-y-6">
                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 mb-6">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Loading Data For</p>
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-primary" />
                        <span className="text-xl font-black text-on-surface">{phone || 'Enter number below'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Recipient Phone Number</label>
                      <input 
                        type="tel" required
                        placeholder="e.g. 0770000000"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Select Package</label>
                      {DATA_PACKAGES.map(pkg => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPackage(pkg)}
                          className={cn(
                            "flex justify-between items-center p-4 rounded-xl border-2 transition-all",
                            selectedPackage?.id === pkg.id ? "border-primary bg-primary/5" : "border-outline-variant/10"
                          )}
                        >
                          <div className="text-left">
                            <p className="font-bold">{pkg.name}</p>
                            <p className="text-[10px] text-outline uppercase">{pkg.volume}</p>
                          </div>
                          <p className="font-black text-primary">{pkg.price.toLocaleString()} UGX</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {action === 'utilities' && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {UTILITIES.map(util => (
                      <button
                        key={util.id}
                        type="button"
                        onClick={() => setSelectedPackage(util)}
                        className={cn(
                          "flex flex-col items-center p-4 rounded-xl border-2 transition-all gap-2",
                          selectedPackage?.id === util.id ? "border-primary bg-primary/5" : "border-outline-variant/10"
                        )}
                      >
                        <span className="text-2xl">{util.icon}</span>
                        <span className="text-[10px] font-bold uppercase">{util.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {action !== 'data' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Amount (UGX)</label>
                    <input 
                      type="number" required
                      placeholder="Enter amount"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold"
                    />
                  </div>
                )}

                {action !== 'topup' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Wallet PIN</label>
                    <input 
                      type="password" required maxLength={4}
                      placeholder="Enter 4-digit PIN"
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold text-center tracking-[1em]"
                    />
                    <p className="text-[10px] text-center text-outline mt-1 italic">Default PIN is 0000</p>
                  </div>
                )}

                <button 
                  disabled={processing || (action === 'data' && !selectedPackage) || (action === 'utilities' && !selectedPackage)}
                  className="w-full bg-primary text-on-primary py-5 rounded-2xl font-bold text-lg hover:bg-primary-container transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <RefreshCcw className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {action === 'topup' ? 'Initiate Top Up' : 'Confirm Transaction'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset PIN Modal */}
      <AnimatePresence>
        {showResetPinModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowResetPinModal(false)}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-surface p-10 rounded-[48px] shadow-2xl max-w-md w-full border border-outline-variant/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black tracking-tight">Set New PIN</h2>
                <button onClick={() => setShowResetPinModal(false)} className="p-2 bg-surface-container-low rounded-xl hover:bg-error-container hover:text-error transition-all">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">New 4-Digit PIN</label>
                  <input 
                    type="password" required maxLength={4}
                    placeholder="Enter new PIN"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold text-center tracking-[1em]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Confirm New PIN</label>
                  <input 
                    type="password" required maxLength={4}
                    placeholder="Confirm new PIN"
                    value={confirmNewPin}
                    onChange={e => setConfirmNewPin(e.target.value)}
                    className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border-none focus:ring-2 ring-primary/20 font-bold text-center tracking-[1em]"
                  />
                </div>

                <button 
                  disabled={processing}
                  className="w-full bg-primary text-on-primary py-5 rounded-2xl font-bold text-lg hover:bg-primary-container transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  {processing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {processing ? 'Updating...' : 'Update PIN'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simulated Phone Notification */}
      <AnimatePresence>
        {incomingSms && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm"
          >
            <div className="bg-surface/90 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-outline-variant/20 flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-xl">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">{incomingSms.sender}</span>
                  <span className="text-[10px] text-outline font-bold">now</span>
                </div>
                <p className="text-xs font-medium text-on-surface leading-relaxed">
                  {incomingSms.message}
                </p>
              </div>
              <button onClick={() => setIncomingSms(null)} className="text-outline hover:text-on-surface transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
