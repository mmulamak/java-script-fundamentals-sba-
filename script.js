/**
 * MAIN FUNCTION: Processes learner submission data to calculate weighted averages

 * 1. First validate all input data meets expected structure
 * 2. Check if assignment group belongs to the course
 * 3. Organize assignments for quick lookup
 * 4. Process each submission while handling edge cases
 * 5. Calculate weighted averages and format results
 */
function getLearnerData(courseInfo, assignmentGroup, learnerSubmissions) {
    // VALIDATION: Check basic input types first
    // Why? Fail fast if fundamental data is invalid
    if (typeof courseInfo !== 'object' || 
        typeof assignmentGroup !== 'object' || 
        !Array.isArray(learnerSubmissions)) {
        throw new Error('Invalid input data types');
    }

    try {
        //  Verify assignment group belongs to course
       
        if (assignmentGroup.course_id !== courseInfo.id) {
            throw new Error('Invalid input: AssignmentGroup does not belong to the specified course.');
        }

        const results = [];
        const currentDate = new Date(); // Used for due date comparisons
        
        // DATA ORGANIZATION: Create assignment map for O(1) lookups
        
        const assignmentMap = new Map();
        assignmentGroup.assignments.forEach(assignment => {
            //  Validate points_possible is valid number
            
            if (typeof assignment.points_possible !== 'number' || assignment.points_possible < 0) {
                throw new Error(`Invalid points_possible for assignment ${assignment.id}`);
            }
            assignmentMap.set(assignment.id, assignment);
        });

        // Organize submissions by learner first
        
        const learnerData = new Map();
        
        // PROCESS EACH SUBMISSION
        for (const submission of learnerSubmissions) {
            // DATA QUALITY
            if (!submission.learner_id || !submission.assignment_id || !submission.submission) {
                console.warn('Invalid submission structure:', submission);
                continue; // Skip invalid but don't fail entire process
            }

            const learnerId = submission.learner_id;
            const assignmentId = submission.assignment_id;
            
            // INITIALIZE LEARNER RECORD
            if (!learnerData.has(learnerId)) {
                learnerData.set(learnerId, {
                    id: learnerId,
                    totalScore: 0,    // Sum of all valid scores
                    totalPossible: 0, // Sum of all possible points
                    assignmentScores: {} // Individual assignment percentages
                });
            }
            
            const learner = learnerData.get(learnerId);
            const assignment = assignmentMap.get(assignmentId);
            
            // SKIP INVALID ASSIGNMENTS
            if (!assignment) continue;
            
            // DUE DATE CHECK
            const dueDate = new Date(assignment.due_at);
            if (dueDate > currentDate) continue;
            
            // DIVISION SAFETY
            if (assignment.points_possible === 0) continue;
            
            // LATE SUBMISSION HANDLING
            const submittedDate = new Date(submission.submission.submitted_at);
            let score = submission.submission.score;
            
            if (submittedDate > dueDate) {
                score = Math.max(0, score - (0.1 * assignment.points_possible));
            }
            
            // CALCULATE PERCENTAGE: Score divided by possible points
            const percentage = score / assignment.points_possible;
            
            // HANDLE DUPLICATES
            if (!learner.assignmentScores[assignmentId] || 
                percentage > learner.assignmentScores[assignmentId]) {
                
                // ADJUST TOTALS: If replacing previous submission
                if (learner.assignmentScores[assignmentId]) {
                    learner.totalScore -= learner.assignmentScores[assignmentId] * assignment.points_possible;
                    learner.totalPossible -= assignment.points_possible;
                }
                
                // UPDATE RECORDS: Store new best score
                learner.assignmentScores[assignmentId] = percentage;
                learner.totalScore += score;
                learner.totalPossible += assignment.points_possible;
            }
        }
        
        // FINAL OUTPUT PREPARATION
        for (const [learnerId, data] of learnerData) {
            if (data.totalPossible === 0) continue; // Skip learners with no valid submissions
            
            const result = {
                id: data.id,
                avg: data.totalScore / data.totalPossible,
                ...data.assignmentScores
            };
            
            results.push(result);
        }
        
        return results;
    } catch (error) {
        // ERROR HANDLING
        console.error('Error processing learner data:', error.message);
        throw error; // Let caller decide how to handle
    }
}

//HELPER FUNCTION: Validates date strings
 
function isValidDate(dateString) {
    return !isNaN(new Date(dateString).getTime());
}

// TEST DATA: Matches structure from assignment example
const courseInfo = {
    id: 1,
    name: "JavaScript Fundamentals"
};

const assignmentGroup = {
    id: 1,
    name: "Homework Assignments",
    course_id: 1,
    group_weight: 0.4,
    assignments: [
        {
            id: 1,
            name: "Variables",
            due_at: "2023-10-01",
            points_possible: 100
        },
        {
            id: 2,
            name: "Functions",
            due_at: "2023-10-08",
            points_possible: 200
        }
    ]
};

const learnerSubmissions = [
    {
        learner_id: 101,
        assignment_id: 1,
        submission: {
            submitted_at: "2023-09-30",
            score: 85
        }
    },
    {
        learner_id: 101,
        assignment_id: 2,
        submission: {
            submitted_at: "2023-10-09", // Late submission
            score: 180
        }
    }
];

// TEST EXECUTION: Demonstrate function works
try {
    const result = getLearnerData(courseInfo, assignmentGroup, learnerSubmissions);
    console.log("Processed Learner Data:", result);
} catch (error) {
    console.error("Failed to process learner data:", error.message);
}