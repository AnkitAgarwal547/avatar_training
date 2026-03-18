export const trainingModules = [
  {
    id: 'workplace-safety',
    title: 'Workplace Safety Essentials',
    description: 'Learn critical safety protocols to keep yourself and your colleagues safe in any work environment.',
    difficulty: 'Beginner',
    duration: '15 min',
    icon: '🛡️',
    color: '#10b981',
    lessons: [
      {
        id: 'ws-1',
        title: 'Introduction to Workplace Safety',
        avatarScript: "Welcome to Workplace Safety Essentials! I'm your training avatar, and I'll guide you through everything you need to know about staying safe at work. Safety isn't just a set of rules — it's a mindset that protects you and everyone around you. Let's get started!",
        content: "Workplace safety encompasses all aspects of protecting workers from injury, illness, and hazards in their work environment. It involves identifying risks, implementing preventive measures, and creating a culture of safety awareness.",
        keyPoints: [
          'Safety is everyone\'s responsibility',
          'Report hazards immediately',
          'Know your emergency exits',
          'Wear appropriate PPE at all times'
        ],
        quiz: {
          question: "What is the FIRST thing you should do when you notice a safety hazard at work?",
          options: [
            "Ignore it if it seems minor",
            "Report it to your supervisor immediately",
            "Try to fix it yourself",
            "Wait until the next safety meeting"
          ],
          correctIndex: 1,
          explanation: "Always report hazards immediately to your supervisor. Even minor-seeming hazards can lead to serious incidents. Never try to fix something outside your expertise."
        }
      },
      {
        id: 'ws-2',
        title: 'Personal Protective Equipment',
        avatarScript: "Now let's talk about Personal Protective Equipment, or PPE. This is your last line of defense against workplace hazards. Whether it's safety goggles, gloves, hard hats, or ear protection — the right PPE can be the difference between going home safe and a trip to the emergency room.",
        content: "PPE includes all equipment designed to protect workers from health and safety risks. Different work environments require different types of PPE, and it's essential to use the correct equipment for each task.",
        keyPoints: [
          'Always inspect PPE before use',
          'Replace damaged PPE immediately',
          'PPE must fit properly to be effective',
          'Different tasks require different PPE'
        ],
        quiz: {
          question: "When should you inspect your Personal Protective Equipment?",
          options: [
            "Once a month",
            "Only when it looks damaged",
            "Before each use",
            "Once a year during safety audits"
          ],
          correctIndex: 2,
          explanation: "You should inspect your PPE before each use. Regular inspection ensures your equipment is in good condition and will protect you when needed."
        }
      },
      {
        id: 'ws-3',
        title: 'Emergency Procedures',
        avatarScript: "Excellent work so far! Now let's cover emergency procedures. When an emergency strikes, every second counts. Knowing what to do before an emergency happens can save lives — including your own. Let me walk you through the key procedures you need to know.",
        content: "Emergency procedures are predetermined plans of action to be taken during various emergencies such as fires, chemical spills, medical emergencies, or natural disasters. Following these procedures ensures an organized and efficient response.",
        keyPoints: [
          'Know the location of all emergency exits',
          'Familiarize yourself with evacuation routes',
          'Know where fire extinguishers are located',
          'Learn basic first aid procedures'
        ],
        quiz: {
          question: "During a fire evacuation, what should you do?",
          options: [
            "Use the elevator for quick escape",
            "Gather your personal belongings first",
            "Follow the designated evacuation route calmly",
            "Open windows to let smoke out"
          ],
          correctIndex: 2,
          explanation: "Always follow the designated evacuation route calmly. Never use elevators during a fire, and don't waste time gathering belongings. Stay low if there's smoke."
        }
      }
    ]
  },
  {
    id: 'customer-service',
    title: 'Customer Service Excellence',
    description: 'Master the art of delivering exceptional customer experiences that build loyalty and satisfaction.',
    difficulty: 'Intermediate',
    duration: '20 min',
    icon: '⭐',
    color: '#f59e0b',
    lessons: [
      {
        id: 'cs-1',
        title: 'Foundations of Great Service',
        avatarScript: "Welcome to Customer Service Excellence! Great customer service is the backbone of any successful business. In this module, I'll teach you proven techniques to create exceptional experiences that keep customers coming back. Ready? Let's dive in!",
        content: "Customer service excellence goes beyond simply solving problems — it's about creating memorable positive experiences at every touchpoint. This requires active listening, empathy, clear communication, and a genuine desire to help.",
        keyPoints: [
          'Listen actively — let customers finish speaking',
          'Show empathy — acknowledge their feelings',
          'Communicate clearly and positively',
          'Follow through on every promise'
        ],
        quiz: {
          question: "A customer is frustrated about a delayed order. What's the best first response?",
          options: [
            "Explain the company's shipping policy",
            "Acknowledge their frustration and apologize",
            "Offer a refund immediately",
            "Transfer them to a manager"
          ],
          correctIndex: 1,
          explanation: "Always acknowledge the customer's feelings first. Empathy builds trust and shows you care about their experience before jumping to solutions."
        }
      },
      {
        id: 'cs-2',
        title: 'Handling Difficult Situations',
        avatarScript: "Now let's tackle something challenging — handling difficult customers. Every service professional faces tough situations. The key is to stay calm, professional, and solution-focused. I'll share techniques that turn complaints into opportunities. Let's go!",
        content: "Difficult situations are inevitable in customer service. The way you handle them defines the quality of service. Using the HEARD technique — Hear, Empathize, Apologize, Resolve, Diagnose — helps turn negative experiences into positive ones.",
        keyPoints: [
          'Stay calm and never take it personally',
          'Use the HEARD technique',
          'Focus on solutions, not blame',
          'Escalate when necessary — know your limits'
        ],
        quiz: {
          question: "What does the 'E' in the HEARD technique stand for?",
          options: [
            "Evaluate",
            "Empathize",
            "Explain",
            "Expedite"
          ],
          correctIndex: 1,
          explanation: "The 'E' stands for Empathize. The HEARD technique is: Hear, Empathize, Apologize, Resolve, Diagnose. Showing empathy is a critical step in resolving customer issues."
        }
      }
    ]
  },
  {
    id: 'data-privacy',
    title: 'Data Privacy Fundamentals',
    description: 'Understand essential data protection principles and your role in safeguarding sensitive information.',
    difficulty: 'Advanced',
    duration: '25 min',
    icon: '🔒',
    color: '#6366f1',
    lessons: [
      {
        id: 'dp-1',
        title: 'Why Data Privacy Matters',
        avatarScript: "Welcome to Data Privacy Fundamentals! In today's digital world, data is one of the most valuable assets — and one of the most vulnerable. Understanding how to protect personal and organizational data isn't optional — it's essential. Let's explore why data privacy matters and what you can do about it!",
        content: "Data privacy refers to the proper handling of personal data — how it's collected, stored, used, and shared. With increasing regulations globally and rising cyber threats, understanding data privacy is crucial for every employee.",
        keyPoints: [
          'Personal data includes names, emails, financial info',
          'Data breaches can cost millions and damage reputation',
          'Regulations like GDPR and CCPA have strict requirements',
          'Every employee plays a role in data protection'
        ],
        quiz: {
          question: "Which of the following is considered personal data?",
          options: [
            "A company's public annual report",
            "An employee's email address",
            "The office building's street address",
            "A product's price list"
          ],
          correctIndex: 1,
          explanation: "An employee's email address is personal data because it can identify a specific individual. Public company information and product prices are not considered personal data."
        }
      },
      {
        id: 'dp-2',
        title: 'Best Practices for Data Protection',
        avatarScript: "Great progress! Now let's get practical. I'm going to share the most important best practices for keeping data safe. These are things you can start applying right now in your daily work. Small actions can prevent big problems!",
        content: "Data protection best practices are the daily habits and procedures that minimize the risk of data breaches. From strong passwords to proper data classification, these practices form your personal line of defense.",
        keyPoints: [
          'Use strong, unique passwords for every account',
          'Enable multi-factor authentication',
          'Never share credentials via email or chat',
          'Lock your screen when stepping away'
        ],
        quiz: {
          question: "What is the most secure way to share login credentials with a colleague when absolutely necessary?",
          options: [
            "Send them via email",
            "Write them on a sticky note",
            "Use an approved password manager with sharing features",
            "Text them on a personal phone"
          ],
          correctIndex: 2,
          explanation: "An approved password manager with sharing features is the only secure way to share credentials when necessary. Never share passwords via email, text, or written notes."
        }
      }
    ]
  }
];

export function getModuleById(id) {
  return trainingModules.find(m => m.id === id);
}

export function getLessonById(moduleId, lessonId) {
  const module = getModuleById(moduleId);
  if (!module) return null;
  return module.lessons.find(l => l.id === lessonId);
}
