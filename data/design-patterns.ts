export const PATTERNS = [
  {
    id: 'singleton',
    name: 'Singleton',
    category: 'Creational',
    content: {
      intent: 'Ensure a class has only one instance and provide a global point of access to it.',
      analogy: 'Like a single system-wide configuration manager.',
      explanation: 'The Singleton restricts object creation for a class to only one instance. Useful for shared resources like logging, configuration, or connection pools.',
      advantages: ['Controlled access to sole instance', 'Reduced namespace pollution'],
      disadvantages: ['Can be abused as a global variable', 'Harder to test'],
      usecases: ['Logging', 'Configuration', 'Driver objects'],
      examples: [
        { title: 'JS Singleton example', code: "const Singleton = (function(){ let instance; function init(){ return { value: 42 }; } return { getInstance(){ if(!instance) instance=init(); return instance } } })();" }
      ]
    }
  }
];

export default PATTERNS;
