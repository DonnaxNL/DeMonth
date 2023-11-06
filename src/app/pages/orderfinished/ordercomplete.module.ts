import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { OrderFinishedComponent } from "./ordercomplete.component";

@NgModule({
    declarations: [
        OrderFinishedComponent
    ],
    imports: [
        SharedModule
    ]
})

export class OrderFinishedModule {
}