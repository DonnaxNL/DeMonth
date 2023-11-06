import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SharedModule } from "../../shared.module";
import { FooterComponent } from "./footer.component";

@NgModule({
    declarations: [
        FooterComponent
    ],
    imports: [
        SharedModule
    ],
    exports: [
        FooterComponent
    ]
})

export class FooterModule {
}