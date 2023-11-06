import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { InTheBoxComponent } from "./in-the-box.component";
import { CarouselModule } from 'ngx-bootstrap/carousel';

@NgModule({
    declarations: [
        InTheBoxComponent
    ],
    imports: [
        SharedModule,
        CarouselModule
    ]
})

export class InTheBoxModule {
}