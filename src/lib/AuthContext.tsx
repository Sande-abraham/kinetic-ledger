import React from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  loginWithPhone: (name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  loginWithPhone: async () => {},
  logout: async () => {},
});

export const useAuth = () => React.useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);

  const login = async () => {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithPhone = async (name: string, phone: string) => {
    const { signInAnonymously, updateProfile } = await import('firebase/auth');
    const { user } = await signInAnonymously(auth);
    
    await updateProfile(user, { displayName: name });
    
    const newProfile = {
      uid: user.uid,
      displayName: name,
      phoneNumber: phone,
      role: 'client',
      walletBalance: 0,
      walletPin: '0000',
      createdAt: serverTimestamp(),
    };
    
    await setDoc(doc(db, 'users', user.uid), newProfile);
    setProfile(newProfile);
  };

  const logout = async () => {
    await auth.signOut();
  };

  React.useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        // Listen to profile changes
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          } else {
            // Profile doesn't exist yet, create it if it's a Google user
            // Anonymous users (phone login) handle their own profile creation to avoid race conditions
            if (user.providerData.length > 0) {
              const newProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'client',
                walletBalance: 0,
                walletPin: '0000',
                createdAt: serverTimestamp(),
              };
              await setDoc(doc(db, 'users', user.uid), newProfile);
            }
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const isAdmin = profile?.role === 'admin' || user?.email === 'gamamediaug@gmail.com';

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    login,
    loginWithPhone,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
