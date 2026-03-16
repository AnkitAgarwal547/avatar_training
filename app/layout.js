import './globals.css';
import Navbar from './components/Navbar';

export const metadata = {
  title: 'AvatarTrainer — AI-Powered Interactive Training',
  description: 'Experience the future of training with an AI-powered talking avatar that delivers interactive lessons, quizzes, and personalized learning.',
};

// Import map so the browser can resolve bare specifiers used by TalkingHead CDN module
const importMap = {
  imports: {
    'three': 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'three/': 'https://cdn.jsdelivr.net/npm/three@0.160.0/',
    'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0e1a" />
        {/* Allow browser to resolve 'three' bare specifier for TalkingHead */}
        <script
          type="importmap"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(importMap) }}
        />
      </head>
      <body>
        <Navbar />
        <main style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </body>
    </html>
  );
}

