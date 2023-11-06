import { db } from "./config";
import { errorReport } from "./slack";

// --------------- Create scheduled tasks ---------------

// Create task
export const createTask = async (functionCall: string, performAt: any, data: any) => {
    const docData = {
        data: data,
        functionCall: functionCall,
        performAt: performAt,
        status: 'scheduled'
    }

    await db.collection(`tasks`).add(docData);
}

// Create survey task
export const createSurveyTask = async (functionCall: string, performAt: any, data: any) => {
    const docData = {
        data: data,
        functionCall: functionCall,
        performAt: performAt,
        status: 'scheduled'
    }

    await db.collection(`survey-tasks`).add(docData);
}

// Get Survey tasks
export const getSurveyTasksFromEmail = async (email: string) => {
    const taskRef = db.collection('survey-tasks').where('data.recipient', '==', email)
    return await taskRef.get().then(async (snapshot: any) => {
        if (snapshot.empty) {
            console.log('Error getting documents', 'no tasks with email: ' + email);
            return null;
        }

        const documentIDs = []
        snapshot.forEach(async (doc: any) => {
            documentIDs.push(doc.id)
            //item = doc.data();
            //console.log(JSON.stringify(item))
        })
        console.log(documentIDs)
        return documentIDs
        // Empty
    }).catch(async (err: any) => {
        console.log('Error getting documents', err);
        await errorReport('getSurveyTasksFromEmail', err)
        return null
    })
}

export const deleteSurveyTasksFromEmail = async (email: string) => {
    const taskRef = db.collection('survey-tasks').where('data.recipient', '==', email)
    await taskRef.get().then(async (snapshot: any) => {
        if (snapshot.empty) {
            console.log('Error getting documents', 'no tasks with email: ' + email);
        }

        snapshot.forEach(async (doc: any) => {
            //console.log('Deleted task: ' + doc.id, doc.data())
            await deleteSurveyTask(doc.id)
        })
        // Empty
    }).catch(async (err: any) => {
        console.log('Error getting documents', err);
        await errorReport('deleteSurveyTasksFromEmail', err)
    })
}

// Delete survey task
export const deleteSurveyTask = async (docId: any) => {
    await db.collection(`survey-tasks`).doc(docId).delete()
}

// Create reminder task
export const createReminderTask = async (functionCall: string, performAt: any, data: any) => {
    const docData = {
        data: data,
        functionCall: functionCall,
        performAt: performAt,
        status: 'scheduled'
    }

    await db.collection(`reminder-tasks`).doc(data.orderId).set(docData)
}

// Delete reminder task
export const deleteReminderTask = async (orderId: any) => {
    await db.collection(`reminder-tasks`).doc(orderId).delete()
}