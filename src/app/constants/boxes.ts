import { BoxType } from '../models/box';

export class Boxes {
    box0 = new BoxType("box_00", "First Period",  "first-period", false, 599, 0, 0, 0, 0);
    box1 = new BoxType("box_01", "Basic", "basic", false, 599, 1549, 5399, 20, 20);
    box2 = new BoxType("box_02", "Plus", "plus", false, 1199, 3249, 11599, 25, 16);
    box3 = new BoxType("box_03", "Complete", "complete", false, 1599, 4349, 16599, 25, 16);
    box13 = new BoxType("box_13", "Trial Box", "trial", true, 1599, 0, 0, 25, 16)

    getBoxById(id: string) {
        if (id == "box_01") {
            return this.box1
        } else if (id == "box_02") {
            return this.box2
        } else if (id == "box_03") {
            return this.box3
        } else if (id == "box_13") {
            return this.box13
        }
    }

    isBoxOneOff(id: string) {
        const box = this.getBoxById(id)
        return box.isOneOff
    }
}