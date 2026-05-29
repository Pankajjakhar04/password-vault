export const securityQuestions = [
  { id: "q1", label: "What was the name of your first school?" },
  { id: "q2", label: "What is the name of your childhood best friend?" },
  { id: "q3", label: "What city were you born in?" },
  { id: "q4", label: "What was the make of your first car?" },
  { id: "q5", label: "What is your favorite book?" },
  { id: "q6", label: "What is the name of your first pet?" },
  { id: "q7", label: "What is your favorite teacher's last name?" },
  { id: "q8", label: "What is the street name of your childhood home?" },
] as const;

export type SecurityQuestionId = (typeof securityQuestions)[number]["id"];
