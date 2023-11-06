import { getUser, updateUser } from "./customers"
import { assert } from "./helpers"

export const assignPoints = async (order: any) => {
    let pointsToAdd = 0
    if (order.boxId === 'box_01') {
        pointsToAdd = pointsToAdd + 5
    } else if (order.boxId === 'box_02') {
        pointsToAdd = pointsToAdd + 7.5
    } else if (order.boxId === 'box_03' || order.boxId === 'box_13') {
        pointsToAdd = pointsToAdd + 10
    }
    const userData = {
        uid: assert(order, 'userId'),
        boxPointsToAdd: pointsToAdd
    }
    await updatePoints(userData);
}

export const updatePoints = async (data) => {
    const firebaseUser = await getUser(data.uid);
    let current = 0
    let lifetime = 0
    if (firebaseUser.points) {
        current = firebaseUser.points.current !== null ? firebaseUser.points.current : 0
        lifetime = firebaseUser.points.lifetime !== null ? firebaseUser.points.lifetime : 0
    }
    const userData = {
        points: {
            current: current + data.boxPointsToAdd,
            lifetime: lifetime + data.boxPointsToAdd
        }
    }
    await updateUser(data.uid, userData);
}