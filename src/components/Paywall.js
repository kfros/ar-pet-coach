'use client';

import { Check, X } from 'lucide-react';

export default function Paywall({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card w-full max-w-md rounded-2xl p-6 relative border border-primary/20 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">👑</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Unlock Full Access</h2>
                    <p className="text-muted-foreground">Get the complete 21-day anxiety relief protocol.</p>
                </div>

                <div className="space-y-4 mb-8">
                    {[
                        'Full 21-Day Anxiety Protocol',
                        'Unlimited AI Bark Analysis',
                        'Private Community Access',
                        'Advanced AR Training Modules'
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="bg-green-500/10 text-green-500 p-1 rounded-full">
                                <Check size={14} />
                            </div>
                            <span className="text-sm font-medium">{feature}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button className="border-2 border-primary bg-primary/5 p-4 rounded-xl relative hover:bg-primary/10 transition-colors">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                            Best Value
                        </div>
                        <div className="font-bold text-lg">$78</div>
                        <div className="text-xs text-muted-foreground">per year</div>
                        <div className="text-xs text-primary font-bold mt-1">Save 35%</div>
                    </button>

                    <button className="border border-border p-4 rounded-xl hover:border-primary/50 transition-colors">
                        <div className="font-bold text-lg">$9.99</div>
                        <div className="text-xs text-muted-foreground">per month</div>
                    </button>
                </div>

                <button className="btn btn-primary w-full py-4 text-lg shadow-lg shadow-primary/25 mb-4">
                    Start 7-Day Free Trial
                </button>

                <p className="text-center text-xs text-muted-foreground">
                    Recurring billing. Cancel anytime. <br />
                    <button className="underline hover:text-foreground">Restore Purchases</button>
                </p>
            </div>
        </div>
    );
}
