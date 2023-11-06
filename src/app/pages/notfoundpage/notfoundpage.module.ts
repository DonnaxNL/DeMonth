import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { NotfoundpageComponent } from "./notfoundpage.component";

@NgModule({
    declarations: [
        NotfoundpageComponent
    ],
    imports: [
        SharedModule
    ]
})

export class NotFoundPageModule {
}