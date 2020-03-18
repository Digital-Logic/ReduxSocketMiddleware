import io from 'socket.io-client';
import { Action, MiddlewareAPI } from 'redux';

/**
 * A SocketAction is a plain object that represents an intention to change the
 * state. SocketActions provide a way for you to emit events and register listeners
 * to Socket.IO.
 *
 * A SocketAction must have a `type` field that indicates the type of action you
 * want to perform. The available types are: `SUBSCRIBE`, `UNSUBSCRIBE`, and `EMIT`.
 *
 * A EMIT action requires an event name to emit to the backend api, data can be provide as
 * a data attribute
 *
 * A SUBSCRIBE action requires an event name to subscribe to, you can provide a handle attribute
 * to provide custom event handling when that event is received, a default handler will be provide if
 * this field is left blank. This action will return a reference to the event handler.
 *
 * A UNSUBSCRIBE action requires an event name and the event handler to unregister from that event.
 *
 */

export interface SocketAction extends Action<string> {
    event: string;
    handle?: Function;
    data?: any
}


const ACTIONS = Object.freeze({
    SUBSCRIBE: 'SOCKET_IO_SUBSCRIBE',
    UNSUBSCRIBE: 'SOCKET_IO_UNSUBSCRIBE',
    EMIT: 'SOCKET_IO_EMIT',
    EMIT_EVENT: 'SOCKET_IO_EMIT_EVENT',
    EVENT_RECEIVED: 'SOCKET_IO_EVENT_RECEIVED'
});


function socketMiddleware() {
    const socket = io();

    return ({ dispatch }:MiddlewareAPI) => (next:Function) => (action: Function | SocketAction ): any => {

        if (typeof action === 'function')
            return next(action);

        const { type, event, handle, data }:SocketAction = action;

        switch(type) {
            case ACTIONS.SUBSCRIBE:
                /**
                 * Dispatch message to front-end developer that we are not subscribed
                 * to event "event" and will execute handle: "handle function name"
                 */
                dispatch({ type: `SUBSCRIBE: ${event}`,
                    event,
                    handle: typeof handle === 'function' ? `function: ${handle.name}` : handle  });

                /**
                 * Setup code to execute handle when specified event occurs.
                 */
                const eventHandler = typeof handle === 'function' ? handle : defaultHandle(event);
                socket.on(event, eventHandler);

                // return the event handler, so the caller can unsubscribe from the event.
                return eventHandler;

            case ACTIONS.UNSUBSCRIBE:
                dispatch({ type: `UNSUBSCRIBE ${event}`, event });

                if (typeof handle !== 'function') // notify user that unsubscribe requires a function reference.
                    throw new Error(`Unable to unsubscribe to ${event}, without a function reference.`);
                // the handle must resolve to the same function that was used to register the event.
                socket.removeListener(event,  handle);
                break;

            case ACTIONS.EMIT:
                dispatch({ type: `EMIT: ${event}`, action: 'SOCKET.IO EMIT', data });
                return socket.emit(event, data);

            default:
                return next(action);
        }

        function defaultHandle(event: string): Function {
            return (data: any) => dispatch({ type: `RECEIVE: ${event}`, data });
        }
    };
}


const actionCreator = {
    emit: (event: string, data: any): SocketAction => ({
        type: ACTIONS.EMIT,
        event,
        data
    }),
    subscribe: (event: string, handle?: Function): SocketAction => ({
        type: ACTIONS.SUBSCRIBE,
        event,
        handle
    }),
    unsubscribe: (event: string, handle: Function): SocketAction => ({
        type: ACTIONS.UNSUBSCRIBE,
        event,
        handle
    })
};

export {
    socketMiddleware,
    ACTIONS as SOCKET_ACTIONS,
    actionCreator
};
