/**
 * Processes learner submission data to calculate weighted averages and assignment scores
 * @param {Object} courseInfo - Course information object
 * @param {Object} assignmentGroup - Assignment group with assignments array
 * @param {Array} learnerSubmissions - Array of learner submission objects
 * @returns {Array} Processed learner data with averages and assignment scores
 */
function getLearnerData(courseInfo, assignmentGroup, learnerSubmissions) {
    // Validate input data types
    if (typeof courseInfo !== 'object' || 
        typeof assignmentGroup !== 'object' || 
        !Array.isArray(learnerSubmissions)) {
        throw new Error('Invalid input data types');
    }

    try {
        // Validate that AssignmentGroup belongs to the course
        if (assignmentGroup.course_id !== courseInfo.id) {
            throw new Error('Invalid input: AssignmentGroup does not belong to the specified course.');
        }

        const results = [];
        const currentDate = new Date();
        
        // Create a map of assignments for quick lookup
        const assignmentMap = new Map();
        assignmentGroup.assignments.forEach(assignment => {
            // Validate assignment data
            if (typeof assignment.points_possible !== 'number' || assignment.points_possible < 0) {
                throw new Error(`Invalid points_possible for assignment ${assignment.id}`);
            }
            assignmentMap.set(assignment.id, assignment);
        });

        // Organize submissions by learner
        const learnerData = new Map();
        
        // Process each submission
        for (const submission of learnerSubmissions) {
            // Validate submission structure
            if (!submission.learner_id || !submission.assignment_id || !submission.submission) {
                console.warn('Invalid submission structure:', submission);
                continue;
            }

            const learnerId = submission.learner_id;
            const assignmentId = submission.assignment_id;
            
            // Initialize learner data if not exists
            if (!learnerData.has(learnerId)) {
                learnerData.set(learnerId, {
                    id: learnerId,
                    totalScore: 0,
                    totalPossible: 0,
                    assignmentScores: {}
                });
            }
            
            const learner = learnerData.get(learnerId);
            const assignment = assignmentMap.get(assignmentId);
            
            // Skip if assignment doesn't exist or not yet due
            if (!assignment) continue;
            
            const dueDate = new Date(assignment.due_at);
            if (dueDate > currentDate) continue;
            
            // Skip if points possible is 0 to avoid division by zero
            if (assignment.points_possible === 0) continue;
            
            // Calculate score with potential late penalty
            const submittedDate = new Date(submission.submission.submitted_at);
            let score = submission.submission.score;
            
            if (submittedDate > dueDate) {
                score = Math.max(0, score - (0.1 * assignment.points_possible));
            }
            
            // Calculate percentage score
            const percentage = score / assignment.points_possible;
            
            // Only keep the highest score if multiple submissions for same assignment
            if (!learner.assignmentScores[assignmentId] || 
                percentage > learner.assignmentScores[assignmentId]) {
                
                // Adjust totals if replacing a previous submission
                if (learner.assignmentScores[assignmentId]) {
                    learner.totalScore -= learner.assignmentScores[assignmentId] * assignment.points_possible;
                    learner.totalPossible -= assignment.points_possible;
                }
                
                learner.assignmentScores[assignmentId] = percentage;
                learner.totalScore += score;
                learner.totalPossible += assignment.points_possible;
            }
        }
        
        // Convert the map to the required output format
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
        console.error('Error processing learner data:', error.message);
        throw error; // Re-throw to let caller handle it
    }
}

// Helper function to validate date strings
function isValidDate(dateString) {
    return !isNaN(new Date(dateString).getTime());
}

// Example usage with test data
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
        },
        {
            id: 3,
            name: "Objects",
            due_at: "2023-10-15",
            points_possible: 150
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
    },
    {
        learner_id: 101,
        assignment_id: 1, // Duplicate submission - should keep higher score
        submission: {
            submitted_at: "2023-09-29",
            score: 90
        }
    },
    {
        learner_id: 102,
        assignment_id: 1,
        submission: {
            submitted_at: "2023-10-02", // Late submission
            score: 95
        }
    },
    {
        learner_id: 102,
        assignment_id: 3,
        submission: {
            submitted_at: "2023-10-10",
            score: 120
        }
    },
    {
        learner_id: 103,
        assignment_id: 2,
        submission: {
            submitted_at: "2023-10-05",
            score: 150
        }
    }
];

// Test the function
try {
    const result = getLearnerData(courseInfo, assignmentGroup, learnerSubmissions);
    console.log("Processed Learner Data:", JSON.stringify(result, null, 2));
} catch (error) {
    console.error("Failed to process learner data:", error.message);
}