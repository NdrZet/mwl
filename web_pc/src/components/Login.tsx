import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Music, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleGoogleLogin = async () => {
        try {
            setError(null);
            setLoading(true);
            await signInWithPopup(auth, googleProvider);
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to login with Google');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return setError('Email and password are required');
        
        try {
            setError(null);
            setLoading(true);
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            console.error('Email Auth error:', err);
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center relative overflow-hidden"
            style={{
                background: '#0A0D0D',
                backgroundImage: [
                    'radial-gradient(ellipse 90% 65% at 10% -10%, rgba(33,128,141,0.22) 0%, transparent 58%)',
                    'radial-gradient(ellipse 65% 55% at 92% 105%, rgba(26,104,115,0.16) 0%, transparent 55%)',
                ].join(', '),
            }}
        >
            <div className="relative z-10 w-full max-w-md p-8 bg-[#121616]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 bg-[#21808D]/20 rounded-2xl flex items-center justify-center mb-6">
                    <Music className="w-8 h-8 text-[#28c840]" />
                </div>
                
                <h1 className="text-3xl font-bold text-white mb-2">Omni Project</h1>
                <p className="text-white/50 text-center mb-6">Sign in to sync your library, likes, and playlists across all your devices.</p>

                {error && (
                    <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm leading-relaxed">{error}</span>
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3 mb-6">
                    <input 
                        type="email" 
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#21808D]"
                    />
                    <input 
                        type="password" 
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#21808D]"
                    />
                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-[#21808D] hover:bg-[#28a1b1] text-white py-3.5 px-6 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign in')}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-white/50 text-sm hover:text-white transition-colors mt-1"
                    >
                        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                </form>

                <div className="w-full flex items-center gap-4 mb-6">
                    <div className="h-[1px] flex-1 bg-white/10"></div>
                    <span className="text-white/30 text-sm">or</span>
                    <div className="h-[1px] flex-1 bg-white/10"></div>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-black py-3.5 px-6 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    {loading ? 'Signing in...' : 'Continue with Google'}
                </button>
            </div>
        </div>
    );
};
