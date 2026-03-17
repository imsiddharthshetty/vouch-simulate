'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center px-4">
        <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/25">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Stress-test your value transfer programs
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
          Simulate adversarial conditions, identify failure modes, and get
          actionable recommendations before you go live.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/simulate/configure')}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
              />
            </svg>
            Start Simulation
          </button>
          <a
            href="https://github.com/vouch-network"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
          >
            Learn More
          </a>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">12</div>
            <div className="text-sm text-gray-500 mt-1">Agent Types</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">7</div>
            <div className="text-sm text-gray-500 mt-1">Stress Scenarios</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">6</div>
            <div className="text-sm text-gray-500 mt-1">Country Contexts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
