# XSSLab Integration Guide

## Quick Start

### 1. Basic Setup
Replace your existing component with the improved version:
```javascript
// Old:
// import XssLabWidget from './XssLab_v2.jsx';

// New:
import XssLabWidget from './XssLab_v2_improved.jsx';
```

### 2. Show a Question
```javascript
// Get reference to the function
const { showQuestionNotification } = useRef();

// Trigger a question
showQuestionNotification(ALL_QUESTIONS[0]);
```

---

## Common Integration Patterns

### Pattern 1: Show Random Question for Current Task

```javascript
const showRandomQuestion = useCallback(() => {
  // Filter questions for current task
  const taskQuestions = ALL_QUESTIONS.filter(q => q.task === currentTaskId);
  
  // Pick random question
  const random = Math.floor(Math.random() * taskQuestions.length);
  const question = taskQuestions[random];
  
  // Show it
  showQuestionNotification(question);
}, [currentTaskId, showQuestionNotification]);

// Usage:
// <button onClick={showRandomQuestion}>Quiz Me</button>
```

### Pattern 2: Auto-Quiz on Task Completion

```javascript
useEffect(() => {
  if (taskCompleted && !alreadyQuizzed) {
    // Delay slightly to let user see completion message
    setTimeout(() => {
      showRandomQuestion();
      setAlreadyQuizzed(true);
    }, 1500);
  }
}, [taskCompleted, alreadyQuizzed]);
```

### Pattern 3: Streak-Based Questioning

```javascript
const [streakCount, setStreakCount] = useState(0);

const handleAnswerQuestion = useCallback((question, selectedOption, isCorrect) => {
  if (answeredQuestions.has(question.id)) return;

  const newAnswered = new Set(answeredQuestions);
  newAnswered.add(question.id);
  setAnsweredQuestions(newAnswered);

  if (isCorrect) {
    const newStreak = streakCount + 1;
    setStreakCount(newStreak);
    
    // Bonus XP for streaks!
    let xpGain = 10;
    if (newStreak >= 3) xpGain = 15;  // 3-streak bonus
    if (newStreak >= 5) xpGain = 20;  // 5-streak bonus
    
    setStudentXP(prev => prev + xpGain);
    
    // Encourage streak continuation
    if (newStreak >= 3) {
      showNotification(`🔥 ${newStreak} correct in a row! +${xpGain} XP`);
    }
  } else {
    setStreakCount(0);  // Reset streak on wrong answer
  }
}, [answeredQuestions, streakCount]);
```

### Pattern 4: Difficulty-Based Leveling

```javascript
const DIFFICULTY_LEVELS = {
  1: { name: 'Novice', xp: 10 },
  2: { name: 'Intermediate', xp: 15 },
  3: { name: 'Expert', xp: 25 }
};

const getQuestionDifficulty = (question) => {
  // Based on question ID or custom logic
  if (question.type === 'scenario') return 3;  // Scenarios are harder
  return question.task <= 2 ? 1 : 2;  // Escalate difficulty
};

const handleAnswerQuestion = useCallback((question, selectedOption, isCorrect) => {
  if (isCorrect) {
    const difficulty = getQuestionDifficulty(question);
    const xpGain = DIFFICULTY_LEVELS[difficulty].xp;
    
    setStudentXP(prev => prev + xpGain);
    showNotification(`✓ Correct! +${xpGain} XP (${DIFFICULTY_LEVELS[difficulty].name})`);
  }
}, []);
```

### Pattern 5: Timed Quiz Mode

```javascript
const [timeRemaining, setTimeRemaining] = useState(30);
const [inQuizMode, setInQuizMode] = useState(false);

const startQuizMode = useCallback(() => {
  setInQuizMode(true);
  setTimeRemaining(30);
  showRandomQuestion();
}, []);

useEffect(() => {
  if (!inQuizMode) return;
  
  const timer = setInterval(() => {
    setTimeRemaining(prev => {
      if (prev <= 1) {
        setInQuizMode(false);
        clearInterval(timer);
        showNotification(`⏱️ Time's up! Final score: ${studentXP} XP`);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(timer);
}, [inQuizMode]);
```

---

## Customization Examples

### Change XP Rewards

```javascript
// In handleAnswerQuestion(), find this line:
const xpGain = 10;  // ← Change this number

// Or make it configurable:
const getXPReward = (question) => {
  if (question.task === 1) return 5;   // Easy tasks
  if (question.task <= 3) return 15;   // Medium
  return 20;                            // Hard tasks
};

const xpGain = getXPReward(question);
```

### Modify Question Notification Styling

```javascript
// Find QuestionNotification component and update styles:
const QuestionNotification = ({ question }) => {
  return (
    <div style={{
      position: 'fixed', 
      top: 20,           // ← Change position
      right: 20,
      width: 420,        // ← Change width
      maxWidth: '90vw',
      background: C.bgCard,
      border: `3px solid ${C.accent}`,  // ← Thicker border
      borderRadius: 12,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      zIndex: 9999,
      animation: 'slideIn 0.3s ease'
    }}>
      {/* ... rest of component ... */}
    </div>
  );
};
```

### Add Custom Notification Types

```javascript
const showNotification = useCallback((message, type = 'info') => {
  const colors = {
    success: C.green,
    error: C.red,
    warning: C.yellow,
    info: C.blue
  };
  
  setNotifications(prev => [...prev, {
    id: `${Date.now()}`,
    type: 'custom',
    message,
    background: colors[type]
  }]);
}, []);

// Usage:
showNotification('Great job! Keep it up!', 'success');
showNotification('Almost there, try again', 'warning');
```

---

## State Management & Context

### Using React Context for Global Access

```javascript
const QuestionContext = React.createContext();

const QuestionProvider = ({ children }) => {
  const [studentXP, setStudentXP] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [activeQuestion, setActiveQuestion] = useState(null);

  const showQuestion = useCallback((question) => {
    setActiveQuestion(question);
  }, []);

  const answerQuestion = useCallback((question, option, isCorrect) => {
    if (isCorrect) {
      setStudentXP(prev => prev + 10);
    }
    setAnsweredQuestions(prev => new Set([...prev, question.id]));
  }, []);

  return (
    <QuestionContext.Provider value={{
      studentXP,
      answeredQuestions,
      activeQuestion,
      showQuestion,
      answerQuestion
    }}>
      {children}
    </QuestionContext.Provider>
  );
};

// Usage in any component:
const useQuestions = () => React.useContext(QuestionContext);

const MyComponent = () => {
  const { studentXP, showQuestion } = useQuestions();
  return <div>XP: {studentXP}</div>;
};
```

---

## API Integration Examples

### Save XP to Backend

```javascript
useEffect(() => {
  // Debounced save
  const timer = setTimeout(() => {
    fetch('/api/student/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: session.id, xp: studentXP })
    })
    .then(r => r.json())
    .then(data => console.log('XP saved:', data))
    .catch(err => console.error('Save failed:', err));
  }, 2000);  // Save after 2 seconds of no changes
  
  return () => clearTimeout(timer);
}, [studentXP]);
```

### Fetch Personalized Questions

```javascript
useEffect(() => {
  // Load questions for current task on mount
  fetch(`/api/questions/task/${currentTaskId}`)
    .then(r => r.json())
    .then(data => {
      // Merge with local questions or replace
      setDynamicQuestions(data);
    })
    .catch(err => console.error('Failed to load questions:', err));
}, [currentTaskId]);
```

### Track Question Performance

```javascript
const handleAnswerQuestion = useCallback((question, selectedOption, isCorrect) => {
  // ... existing logic ...
  
  // Send analytics
  fetch('/api/analytics/question-answered', {
    method: 'POST',
    body: JSON.stringify({
      questionId: question.id,
      taskId: question.task,
      isCorrect,
      timeToAnswer: Date.now() - questionStartTime,
      studentId: session.id
    })
  }).catch(err => console.error('Analytics failed:', err));
}, []);
```

---

## Testing & Debugging

### Test Correct Answer
```javascript
// In browser console:
const correctQuestion = ALL_QUESTIONS[0];
showQuestionNotification(correctQuestion);
// Select answer: "B"
// Click Submit → Should show "✓ Correct! +10 XP"
```

### Test Wrong Answer
```javascript
const correctQuestion = ALL_QUESTIONS[0];
showQuestionNotification(correctQuestion);
// Select answer: "A" (wrong)
// Click Submit → Should show "✗ Incorrect. Try again!"
```

### Inspect State
```javascript
// Add console logs in handleAnswerQuestion:
console.log('Question:', question);
console.log('Selected:', selectedOption);
console.log('Correct:', correctAnswer);
console.log('IsCorrect:', isCorrect);
console.log('New XP:', studentXP + 10);
```

---

## Performance Optimization

### Memoize Question List
```javascript
const memoizedQuestions = useMemo(
  () => ALL_QUESTIONS.filter(q => q.task === currentTaskId),
  [currentTaskId]
);

const showRandomQuestion = useCallback(() => {
  const idx = Math.floor(Math.random() * memoizedQuestions.length);
  showQuestionNotification(memoizedQuestions[idx]);
}, [memoizedQuestions, showQuestionNotification]);
```

### Debounce Notification Cleanup
```javascript
const notificationTimeoutRef = useRef(null);

useEffect(() => {
  // Clear previous timer
  if (notificationTimeoutRef.current) {
    clearTimeout(notificationTimeoutRef.current);
  }
  
  // Set new timer
  notificationTimeoutRef.current = setTimeout(() => {
    setNotifications(prev => prev.slice(1));
  }, 5000);
  
  return () => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
  };
}, [notifications.length]);
```

---

## Accessibility Improvements

### ARIA Labels
```javascript
<QuestionNotification question={activeQuestion} role="dialog" aria-labelledby="question-title" />

<div id="question-title" style={{ fontSize: 14, color: C.text }}>
  {question.q}
</div>

<label htmlFor={`option-${opt}`}>
  <input 
    id={`option-${opt}`}
    type="radio" 
    name={question.id} 
    value={opt[0]} 
    aria-label={`Option ${opt}`}
  />
  {opt}
</label>
```

### Keyboard Navigation
```javascript
useEffect(() => {
  const handleKeyPress = (e) => {
    if (!activeQuestion) return;
    
    // 1-4 keys select options
    if (e.key >= '1' && e.key <= '4') {
      setSelected(['A', 'B', 'C', 'D'][parseInt(e.key) - 1]);
    }
    
    // Enter submits
    if (e.key === 'Enter') {
      handleSubmit();
    }
    
    // Escape skips
    if (e.key === 'Escape') {
      setActiveQuestion(null);
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [activeQuestion, selected]);
```

---

## Migration Checklist

- [ ] Replace component file
- [ ] Remove any existing Quiz tab navigation
- [ ] Update task guide reference (if customized)
- [ ] Test question notifications appear
- [ ] Verify XP counter updates
- [ ] Check success/error messages display
- [ ] Ensure auto-close works (2-5 seconds)
- [ ] Mobile responsive testing
- [ ] Analytics/logging integration
- [ ] Accessibility audit (keyboard nav, ARIA)
- [ ] Deploy to staging first
- [ ] A/B test if desired

---

## Support & Troubleshooting

### Issue: Questions not appearing
```javascript
// Make sure you're calling showQuestionNotification correctly:
showQuestionNotification(ALL_QUESTIONS[0]);  // ✓ Correct
// NOT:
showQuestion(0);  // ✗ Wrong function name
```

### Issue: XP not updating
```javascript
// Check that handleAnswerQuestion is being called:
console.log('Answer handler called:', isCorrect, xpGain);

// Verify studentXP state is updating:
useEffect(() => {
  console.log('XP updated to:', studentXP);
}, [studentXP]);
```

### Issue: Styling conflicts
```javascript
// Use !important if CSS specificity issues:
border: `2px solid ${C.border} !important;`

// Or use inline styles (safer in React):
style={{ border: `2px solid ${C.border}` }}
```

### Issue: Multiple notifications stacking
```javascript
// Limit notifications array size:
const addNotification = (notif) => {
  setNotifications(prev => {
    const updated = [...prev, notif];
    return updated.slice(-3);  // Keep only last 3
  });
};
```

