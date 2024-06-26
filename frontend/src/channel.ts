// this module is responsible for back and forth communication between the frontend and the backend
// using the long polling mechanism

// todo: extract the event types from the backend and use them here
import * as types from './../../backend/src/types';

const GAME_EVENTS = {
    DRAW_CARD: 'DRAW_CARD',
    THROW_CARD: 'THROW_CARD',
    JOIN_GAME: 'JOIN_GAME',
    LEAVE_GAME: 'LEAVE_GAME',
    STATE_SYNC: 'STATE_SYNC',
};

let jwt: string = '';

let gameEventsDispatcher: (event: types.AppEvent) => void = () => {};

export function setGameEventsDispatcher(
    dispatcher: (event: types.AppEvent) => void
) {
    gameEventsDispatcher = dispatcher;
}
let abortController: AbortController | null = null;
async function poll() {
    if (abortController) {
        abortController.abort();
    }
    abortController = new AbortController();
    console.log('Polling');
    const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/game/events`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: jwt,
            },
            signal: abortController.signal,
        }
    );
    if (!res.ok) {
        throw new Error((await res.json()).error);
    }
    const data: types.AppEvent = await res.json();
    console.log('Received event:', data);
    if (GAME_EVENTS[data.type]) {
        // it is a game event
        gameEventsDispatcher(data);
    } else {
        console.log('No handler for event type: ', data.type);
    }
}

function pollLoop() {
    poll()
        .then(() => {
            pollLoop();
        })
        .catch((e) => {
            console.error('Error polling:', e);
            // setTimeout(() => {
            //     console.log('Retrying polling');
            //     pollLoop();
            // }, 5000);
        });
}

export function startPolling(_jwt: string) {
    jwt = _jwt;
    pollLoop();
}

export function stopPolling() {
    if (abortController) {
        abortController.abort();
    }
}
