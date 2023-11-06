import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { AboutComponent } from "./about.component";

@NgModule({
    declarations: [
        AboutComponent
    ],
    imports: [
        SharedModule
    ]
})

export class AboutModule {
}