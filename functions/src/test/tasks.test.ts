import { db } from "../config";

// --------------- Create scheduled tasks ---------------

// Create task
export const createTaskTest = async (functionCall: string, performAt: any, data: any) => {
    const docData  = {
        data: data,
        functionCall: functionCall,
        performAt: performAt,
        status: 'scheduled'
    }

    await db.collection(`tasks`).add(docData);
}

// Create survey task
export const createSurveyTaskTest = async (functionCall: string, performAt: any, data: any) => {
    const docData  = {
        data: data,
        functionCall: functionCall,
        performAt: performAt,
        status: 'scheduled'
    }

    await db.collection(`survey-tasks`).add(docData);
}