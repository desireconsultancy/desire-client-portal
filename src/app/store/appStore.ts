

import { create } from "zustand";
import { supabase, supabaseHeaders } from "../utils/supabaseClient";
import { auth as firebaseAuth } from "../utils/firebaseClient";
import { onIdTokenChanged, signOut as fbSignOut } from "firebase/auth";

export interface User {
  id: string;
  name: string;
  companyName: string;
  clientId: string;
  email: string;
  mobile: string;
  address: string;
  gstNumber: string;
  avatarUrl?: string;
  firebaseUid?: string;
}

interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  authProvider: "firebase" | "supabase" | null;
  notificationCount: number;
  loading: boolean;
  login: (email: string, sessionUser: any, provider?: "firebase" | "supabase") => void;
  logout: () => Promise<void>;
  setNotificationCount: (count: number) => void;
  fetchProfile: (uid: string) => Promise<User | null>;
  setProfile: (user: User) => void;
  initializeAuth: () => void;
}

const mockAddress = "Plot 42, Industrial Area, Sector 18, Gurugram, Haryana 122015";
const mockGst = "06AADCS1234F1Z5";

export const useAppStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  authProvider: null,
  notificationCount: 0,
  loading: true,

  login: (email: string, sessionUser: any, provider: "firebase" | "supabase" = "supabase") => {
    const mappedUser: User = {
      id: sessionUser.id,
      name: sessionUser.name || "User",
      companyName: sessionUser.companyName || "My Company",
      clientId: sessionUser.clientId || `DC-${new Date().getFullYear()}-${sessionUser.id.substring(0, 4).toUpperCase()}`,
      email: email,
      mobile: sessionUser.mobile || "",
      address: sessionUser.address || mockAddress,
      gstNumber: sessionUser.gstNumber || mockGst,
      avatarUrl: sessionUser.avatarUrl || undefined,
    };
    set({ isAuthenticated: true, user: mappedUser, authProvider: provider, loading: false });
  },

  logout: async () => {
    try {
      await fbSignOut(firebaseAuth);
      await supabase.auth.signOut();
      supabaseHeaders['x-firebase-auth'] = null;
    } catch (err) {
      console.error("Auth signOut error:", err);
    }
    set({ isAuthenticated: false, user: null, authProvider: null, notificationCount: 0, loading: false });
  },

  setNotificationCount: (count: number) => {
    set({ notificationCount: count });
  },

  fetchProfile: async (uid: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`id.eq.${uid},firebase_uid.eq.${uid}`)
        .single();

      if (error || !data) {
        console.warn("Profile fetch returned empty or error:", error);
        return null;
      }

      const mappedUser: User = {
        id: data.id,
        name: data.name || "",
        companyName: data.company_name || "",
        clientId: data.client_id || `DC-2026-${data.id.substring(0, 4).toUpperCase()}`,
        email: data.email || "",
        mobile: data.phone || "",
        address: data.address || mockAddress,
        gstNumber: data.gst_number || mockGst,
        avatarUrl: data.avatar_url || undefined,
        firebaseUid: data.firebase_uid || undefined,
      };

      set({ isAuthenticated: true, user: mappedUser, loading: false });
      return mappedUser;
    } catch (e) {
      console.error("fetchProfile exception:", e);
      return null;
    }
  },

  setProfile: (user: User) => {
    set({ user });
  },

  initializeAuth: () => {
    let fbChecked = false;
    let sbChecked = false;

    const checkDone = () => {
      if (fbChecked && sbChecked) {
        const hasFb = !!firebaseAuth.currentUser;
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!hasFb && !session) {
            set({ isAuthenticated: false, user: null, authProvider: null, loading: false });
          }
        });
      }
    };

    // 1. Firebase Auth listener (for Google Sign-In)
    onIdTokenChanged(firebaseAuth, async (fbUser) => {
      fbChecked = true;
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          supabaseHeaders['x-firebase-auth'] = token;
        } catch (err) {
          console.error("Error setting x-firebase-auth token:", err);
        }

        const profile = await get().fetchProfile(fbUser.uid);
        if (!profile) {
          const mappedUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || "",
            companyName: "",
            clientId: `DC-2026-${fbUser.uid.substring(0, 4).toUpperCase()}`,
            email: fbUser.email || "",
            mobile: fbUser.phoneNumber || "",
            address: mockAddress,
            gstNumber: mockGst,
            avatarUrl: fbUser.photoURL || undefined,
          };
          set({ isAuthenticated: true, user: mappedUser, authProvider: "firebase", loading: false });
        } else {
          set({ authProvider: "firebase", loading: false });
        }
      } else {
        // Firebase user signed out
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          supabaseHeaders['x-firebase-auth'] = null;
          set({ isAuthenticated: false, user: null, authProvider: null, loading: false });
        } else {
          checkDone();
        }
      }
    });

    // 2. Supabase Auth listener (for Email/Password Auth)
    supabase.auth.onAuthStateChange(async (event, session) => {
      sbChecked = true;
      if (session?.user) {
        // Clear Firebase custom claim header since we are native Supabase auth
        supabaseHeaders['x-firebase-auth'] = null;

        const profile = await get().fetchProfile(session.user.id);
        if (!profile) {
          const mappedUser: User = {
            id: session.user.id,
            name: "",
            companyName: "",
            clientId: `DC-2026-${session.user.id.substring(0, 4).toUpperCase()}`,
            email: session.user.email || "",
            mobile: "",
            address: mockAddress,
            gstNumber: mockGst,
          };
          set({ isAuthenticated: true, user: mappedUser, authProvider: "supabase", loading: false });
        } else {
          set({ authProvider: "supabase", loading: false });
        }
      } else {
        // Supabase user signed out
        if (!firebaseAuth.currentUser) {
          if (fbChecked) {
            set({ isAuthenticated: false, user: null, authProvider: null, loading: false });
          } else {
            checkDone();
          }
        } else {
          checkDone();
        }
      }
    });
  },
})
);
