import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  Recycler,
  RecyclerSession,
} from '../types/auth';

const SESSION_KEY = '@reloop/recycler-session';

interface StoredAuth {
  session: RecyclerSession;
  recycler: Recycler;
}

interface AuthContextValue {
  session: RecyclerSession | null;

  recycler: Recycler | null;

  isLoading: boolean;

  isAuthenticated: boolean;

  recyclerId: number | null;

  signIn: (
    session: RecyclerSession,
    recycler: Recycler,
  ) => Promise<void>;

  signOut: () => Promise<void>;

  updateRecycler: (
    recycler: Recycler,
  ) => Promise<void>;

  updatePreferredLanguage: (
    language: string,
  ) => Promise<void>;
}

const AuthContext =
  createContext<AuthContextValue | null>(null);

function isValidStoredAuth(
  value: unknown,
): value is StoredAuth {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false;
  }

  const stored = value as Partial<StoredAuth>;

  if (!stored.session || !stored.recycler) {
    return false;
  }

  if (stored.session.role !== 'recycler') {
    return false;
  }

  if (
    typeof stored.session.userId !== 'number' ||
    stored.session.userId <= 0
  ) {
    return false;
  }

  if (
    typeof stored.session.token !== 'string' ||
    stored.session.token.trim().length === 0
  ) {
    return false;
  }

  if (
    typeof stored.recycler.id !== 'number' ||
    stored.recycler.id <= 0
  ) {
    return false;
  }

  return true;
}

async function saveStoredAuth(
  value: StoredAuth,
): Promise<void> {
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify(value),
  );
}

async function readStoredAuth():
  Promise<StoredAuth | null> {
  try {
    const raw =
      await AsyncStorage.getItem(SESSION_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown =
      JSON.parse(raw);

    if (!isValidStoredAuth(parsed)) {
      await AsyncStorage.removeItem(
        SESSION_KEY,
      );

      return null;
    }

    return parsed;
  } catch (error) {
    console.error(
      '[Auth] Failed to restore session:',
      error,
    );

    await AsyncStorage.removeItem(
      SESSION_KEY,
    );

    return null;
  }
}

export async function getSession():
  Promise<RecyclerSession | null> {
  const stored =
    await readStoredAuth();

  return stored?.session ?? null;
}

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [
    session,
    setSession,
  ] =
    useState<RecyclerSession | null>(
      null,
    );

  const [
    recycler,
    setRecycler,
  ] =
    useState<Recycler | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const stored =
          await readStoredAuth();

        if (!mounted) {
          return;
        }

        if (!stored) {
          setSession(null);
          setRecycler(null);

          return;
        }

        setSession(stored.session);
        setRecycler(stored.recycler);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn =
    useCallback(
      async (
        nextSession:
          RecyclerSession,

        nextRecycler:
          Recycler,
      ): Promise<void> => {
        const stored: StoredAuth = {
          session: nextSession,
          recycler: nextRecycler,
        };

        await saveStoredAuth(stored);

        setSession(nextSession);
        setRecycler(nextRecycler);
      },
      [],
    );

  const signOut =
    useCallback(
      async (): Promise<void> => {
        try {
          await AsyncStorage.removeItem(
            SESSION_KEY,
          );
        } finally {
          setSession(null);
          setRecycler(null);
        }
      },
      [],
    );

  const updateRecycler =
    useCallback(
      async (
        nextRecycler:
          Recycler,
      ): Promise<void> => {
        if (!session) {
          throw new Error(
            'No active recycler session.',
          );
        }

        const stored: StoredAuth = {
          session,
          recycler: nextRecycler,
        };

        await saveStoredAuth(stored);

        setRecycler(nextRecycler);
      },
      [session],
    );

  const updatePreferredLanguage =
    useCallback(
      async (
        language: string,
      ): Promise<void> => {
        if (
          !session ||
          !recycler
        ) {
          return;
        }

        const nextSession:
          RecyclerSession = {
          ...session,

          preferred_language:
            language,
        };

        const stored: StoredAuth = {
          session: nextSession,
          recycler,
        };

        await saveStoredAuth(stored);

        setSession(nextSession);
      },
      [
        session,
        recycler,
      ],
    );

  const recyclerId =
    session?.role === 'recycler'
      ? session.userId
      : null;

  const isAuthenticated =
    Boolean(
      session &&
      recycler &&
      session.role === 'recycler' &&
      session.userId === recycler.id &&
      session.token,
    );

  const value =
    useMemo<AuthContextValue>(
      () => ({
        session,
        recycler,

        isLoading,
        isAuthenticated,

        recyclerId,

        signIn,
        signOut,

        updateRecycler,
        updatePreferredLanguage,
      }),
      [
        session,
        recycler,

        isLoading,
        isAuthenticated,

        recyclerId,

        signIn,
        signOut,

        updateRecycler,
        updatePreferredLanguage,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth():
  AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.',
    );
  }

  return context;
}