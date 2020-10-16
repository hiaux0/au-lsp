import { bindable } from 'aurelia-framework';

export class CompoUser {
    @bindable thisIsMe: string = 'hello';

    message: string = 'compo user'

    counter: number = 0;

    increaseCounter(): number {
        return 1;
    }
}
