﻿/// <reference path="../room/room.ts" />
/// <reference path="portal.ts" />
/// <reference path="versecontrols.ts" />
/// <reference path="../multi/multiuserclient.ts" />
/// <reference path="roomstate.ts" />

module wm.verse {
    export class VerseClient {

        renderer: THREE.WebGLRenderer;
        gl: WebGLRenderingContext;

        camera: THREE.PerspectiveCamera;

        roomState: RoomState;
        controls: VerseControls;
        multiUserClient: multi.MultiUserClient


        constructor(renderer: THREE.WebGLRenderer) {
            this.renderer = renderer;
            this.gl = this.renderer.context;

            var aspect = window.innerWidth / window.innerHeight;
            this.camera = new THREE.PerspectiveCamera(70, aspect, 0.001, 2000);

            this.roomState = new verse.RoomState();

            this.controls = new VerseControls(this.camera, this.roomState);

            window.addEventListener('resize', this.onWindowResize);
            this.multiUserClient = new multi.MultiUserClient(this.roomState, this.controls);

        }

        update() {

            this.controls.update();
            this.multiUserClient.update();

            var intersectedPortal = this.controls.checkPortalIntersection(this.roomState.currentRoom);
            if (intersectedPortal) {
                console.log("Moved through portal!");
                this.moveThroughPortal(intersectedPortal);
            }

            this.render();

        }

        render() {
            this.roomState.currentRoom.render(this.gl, this.renderer, this.camera);
        }



        moveThroughPortal(portal: Portal) {
            var roomId = portal.toRoomId;
            var room = this.roomState.roomDictionary[roomId];
            var where = portal.getPortalViewMatrix(this.controls.camera.matrixWorld);
            this.roomState.switchToRoom(room, where);
        }

        onWindowResize = (event) => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }



    }


}