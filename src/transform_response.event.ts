import { GenericEvent } from "@rxstack/async-event-dispatcher";
import { Response as RxStackResponse } from "@rxstack/core";
import { Response as ExpressResponse } from "express";

export class TransformResponseEvent extends GenericEvent {

    constructor(
        public readonly inputResponse: RxStackResponse,
        public readonly outputResponse: ExpressResponse
    ) {
        super();
    }
}