import { GenericEvent } from "@rxstack/async-event-dispatcher";
import { Request as RxStackRequest } from "@rxstack/core";
import { Request as ExpressRequest } from "express";

export class TransformRequestEvent extends GenericEvent {
    constructor(
        public readonly inputRequest: ExpressRequest,
        public readonly outputRequest: RxStackRequest
    ) {
        super();
    }
}