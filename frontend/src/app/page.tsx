import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white p-12 rounded-[40px] shadow-2xl border border-gray-100 text-center relative overflow-hidden">
        {/* Branding Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-ucm-gold" />
        
        {/* Logo Placeholder */}
        <div className="mx-auto w-32 h-32 bg-gray-50 rounded-[32px] flex items-center justify-center mb-8 border-2 border-dashed border-gray-200 group hover:border-primary transition-colors overflow-hidden">
          {/* USER: Replace this div with your <img src="/logo.png" /> */}
          <span className="text-gray-300 font-black uppercase tracking-widest text-xs group-hover:text-primary transition-colors px-4">Logo Placeholder</span>
        </div>

        {/* Title */}
        <div className="space-y-2 mb-12">
          <h1 className="text-5xl font-black text-ucm-navy tracking-tighter">TAForEd</h1>
          <p className="text-[10px] font-bold text-ucm-gold uppercase tracking-[0.3em]">Powered by an LLM</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-4">
          <Link 
            href="/login" 
            className="flex items-center justify-center w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-ucm-navy transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-sm active:scale-95"
          >
            <LogIn className="h-4 w-4 mr-2" /> Log In
          </Link>
          
          <Link 
            href="/signup" 
            className="flex items-center justify-center w-full py-4 bg-white border-2 border-gray-100 text-ucm-navy rounded-2xl font-black hover:bg-gray-50 transition-all uppercase tracking-widest text-sm active:scale-95"
          >
            <UserPlus className="h-4 w-4 mr-2 text-primary" /> Create Account
          </Link>
        </div>

        {/* Footer info */}
        <p className="mt-12 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
          Thematic Analysis Intelligence
        </p>
      </div>
    </div>
  );
}
