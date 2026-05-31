import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const AuthLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* Slow-moving floating luxury ambient light spheres */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/15 rounded-full blur-[140px] pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 40, -20, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-gold/15 rounded-full blur-[140px] pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <span 
            onClick={() => navigate('/')}
            className="text-3xl font-black tracking-widest bg-gradient-to-r from-brand via-brand-gold to-brand bg-clip-text text-transparent cursor-pointer hover:brightness-110 active:scale-98 transition-all drop-shadow-[0_0_15px_rgba(229,9,20,0.2)]"
          >
            CINEMAPASS
          </span>
          <p className="text-gray-500 text-[10px] mt-2 font-black tracking-widest uppercase">Premium Theatre Experience</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};
