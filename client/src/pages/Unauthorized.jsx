import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="rounded-2xl bg-white p-8 shadow-xl max-w-md border border-slate-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-6 animate-pulse">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Access Denied</h1>
        <p className="mt-3 text-slate-500 text-sm leading-relaxed">
          You are not authorized to view this resource. Role-based access rules restrict this page to authorized accounts only.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-500/20 hover:bg-primary-500 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
