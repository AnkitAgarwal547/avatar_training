import './globals.css';
import Navbar from './components/Navbar';

export const metadata = {
  title: 'AvatarTrainer — AI-Powered Interactive Training',
  description: 'Experience the future of training with an AI-powered talking avatar that delivers interactive lessons, quizzes, and personalized learning.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0e1a" />
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
