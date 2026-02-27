import { db } from './firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';

const exercises = [
    {
        day: 1,
        title: "Introduction to Calmness",
        description: "Learn to reward your dog for calm behavior.",
        steps: ["Wait for your dog to sit or lie down.", "Say 'Yes' and treat.", "Repeat 10 times."],
        duration: "5 mins",
        type: "Foundation"
    },
    {
        day: 2,
        title: "The 'Mat' Command",
        description: "Teach your dog to go to a specific place to relax.",
        steps: ["Lure dog to mat.", "Treat when 4 paws are on it.", "Add cue 'Mat'."],
        duration: "10 mins",
        type: "Foundation"
    },
    {
        day: 3,
        title: "Desensitization to Keys",
        description: "Reduce anxiety triggers related to departure cues.",
        steps: ["Pick up keys.", "Put them down immediately.", "Ignore dog.", "Repeat throughout the day."],
        duration: "2 mins",
        type: "Desensitization"
    },
    {
        day: 4,
        title: "Short Separations (Door Closed)",
        description: "Practice being behind a closed door.",
        steps: ["Go to bathroom.", "Close door for 5 seconds.", "Come out.", "Ignore dog."],
        duration: "5 mins",
        type: "Separation"
    },
    {
        day: 5,
        title: "Stay Training",
        description: "Build impulse control.",
        steps: ["Ask for Sit.", "Say 'Stay' and take 1 step back.", "Return and treat.", "Increase distance gradually."],
        duration: "10 mins",
        type: "Foundation"
    },
    {
        day: 6,
        title: "Desensitization to Shoes/Coat",
        description: "Reduce anxiety triggers related to departure cues.",
        steps: ["Put on shoes.", "Sit on couch.", "Take off shoes.", "Repeat with coat."],
        duration: "5 mins",
        type: "Desensitization"
    },
    {
        day: 7,
        title: "Review & Rest",
        description: "A day to relax and review progress.",
        steps: ["Go for a long sniff walk.", "Practice 'Mat' command once."],
        duration: "20 mins",
        type: "Rest"
    }
    // ... (In a real app, we'd have all 21 days)
];

export const seedExercises = async () => {
    const batch = writeBatch(db);

    exercises.forEach((ex) => {
        const docRef = doc(db, 'exercises', `day-${ex.day}`);
        batch.set(docRef, ex);
    });

    try {
        await batch.commit();
        console.log("Exercises seeded successfully!");
    } catch (error) {
        console.error("Error seeding exercises:", error);
    }
};
