var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var wm;
(function (wm) {
    var verse;
    (function (verse) {
        var Portal = (function (_super) {
            __extends(Portal, _super);
            function Portal(toRoomId) {
                this.toRoomId = toRoomId;
                var geom = new THREE.PlaneBufferGeometry(20, 60);
                //var geom = new THREE.CylinderGeometry(20, 20, 50);
                var mat = new THREE.MeshBasicMaterial();
                //mat.side = THREE.DoubleSide;
                _super.call(this, geom, mat);
                this.stencilScene = new THREE.Scene();
                this.geometry.computeFaceNormals();
                var p = this.clone();
                p.updateMatrixWorld(true);
                this.stencilScene.add(this);
            }
            Portal.prototype.setToPortal = function (toPortal, toRoom) {
                this.toPortal = toPortal;
                this.toScene = toRoom.scene;
                this.toRoomId = toRoom.id;
                this.updateStencilSceneMatrix();
            };
            Portal.prototype.isLinked = function () {
                return this.toScene ? true : false;
            };
            Portal.prototype.render = function (gl, renderer, camera, i) {
                if (!this.toScene) {
                    return;
                }
                var originalCameraMatrixWorld = camera.matrixWorld.clone();
                // var originalNear = camera.near;
                // 1 Disable drawing to the color buffer and the depth buffer, 
                // but enable writing to the stencil buffer.
                gl.colorMask(false, false, false, false);
                gl.depthMask(false);
                gl.stencilFunc(gl.NEVER, i + 1, 0xFF);
                gl.stencilMask(0xFF);
                // 4 Draw the portal’s frame. At this point the stencil buffer is filled with zero’s
                // on the outside of the portal’s frame and i+1’s on the inside.
                renderer.render(this.stencilScene, camera);
                // 5 Generate the virtual camera’s view matrix using the view frustum clipping method.
                camera.matrixWorld = this.getPortalViewMatrix(camera.matrixWorld);
                // 6 Disable writing to the stencil buffer, 
                // but enable drawing to the color buffer and the depth buffer.
                gl.colorMask(true, true, true, true);
                gl.depthMask(true);
                gl.stencilMask(0x00);
                // Set to only draw within the rectangle of the current portal
                // Where the stencil mask value is i+1.
                gl.stencilFunc(gl.EQUAL, i + 1, 0xff);
                // 8 Draw the scene using the virtual camera from step 5. 
                // This will only draw inside of the portal’s frame because of the stencil test.
                renderer.render(this.toScene, camera);
                //camera.near = originalNear;
                camera.matrixWorld = originalCameraMatrixWorld;
            };
            Portal.prototype.getPortalViewMatrix = function (originalView) {
                var t = new THREE.Matrix4().makeTranslation(this.position.x - this.toPortal.position.x, this.position.y - this.toPortal.position.y, this.position.z - this.toPortal.position.z);
                t.getInverse(t);
                return t.multiply(originalView);
            };
            /**
            * Raycast from `from` to `to`, to check if avatar has to be teleported
            * @return an intersection with the portal mesh was made.
            */
            Portal.prototype.checkIntersection = function (from, to) {
                //Portal doesn't have a target
                if (!this.toPortal)
                    return false;
                var direction = new THREE.Vector3().copy(to).sub(from);
                var caster = new THREE.Raycaster();
                caster.precision = 0.00001;
                caster.set(from, direction);
                var intersect = caster.intersectObject(this);
                for (var i = 0; i < intersect.length; i++) {
                    if (intersect[i].distance < direction.length()) {
                        return true;
                    }
                }
                return false;
            };
            Portal.prototype.updateStencilSceneMatrix = function () {
                this.stencilScene.updateMatrix();
                this.stencilScene.updateMatrixWorld(true);
            };
            return Portal;
        })(THREE.Mesh);
        verse.Portal = Portal;
    })(verse = wm.verse || (wm.verse = {}));
})(wm || (wm = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../verse/portal.ts"/>
var wm;
(function (wm) {
    var room;
    (function (room) {
        var Portal = wm.verse.Portal;
        var Room = (function () {
            function Room(id) {
                this.scene = new THREE.Scene();
                this.portals = [];
                this.id = id;
            }
            Room.prototype.render = function (gl, renderer, camera) {
                //0 Clear the previous frame
                renderer.clear(true, true, true);
                gl.enable(gl.STENCIL_TEST);
                // 2 Set the stencil operation to GL_REPLACE on sfail,
                // meaning that the stencil value will be set when the stencil test fails.
                gl.stencilOp(gl.REPLACE, gl.KEEP, gl.KEEP);
                for (var i = 0; i < this.portals.length; i++) {
                    //for (var i = this.portals.length-1; i >= 0; i--) {
                    this.portals[i].render(gl, renderer, camera, i);
                }
                //9 Disable the stencil test, disable drawing to the color buffer, 
                // and enable drawing to the depth buffer.
                gl.disable(gl.STENCIL_TEST);
                gl.colorMask(false, false, false, false);
                gl.depthMask(true);
                // 10 Clear the depth buffer.
                renderer.clear(false, true, false);
                // 11 Draw the portal frame once again, 
                // this time to the depth buffer which was just cleared.
                for (var i = 0; i < this.portals.length; i++) {
                    renderer.render(this.portals[i].stencilScene, camera);
                }
                // 12 Enable the color buffer again.
                gl.colorMask(true, true, true, true);
                // 13 Draw the whole scene with the regular camera.
                renderer.render(this.scene, camera);
                // 14 ???
                // 15 profit
            };
            Room.prototype.add = function (object) {
                this.scene.add(object);
            };
            Room.prototype.addPortal = function (portal) {
                return this.portals.push(portal);
            };
            Room.prototype.remove = function (object) {
                this.scene.remove(object);
            };
            Room.prototype.addEntrancePortal = function () {
                if (this.entrancePortal) {
                    throw 'Room already has an entrance portal!';
                }
                var portal = new Portal('ENTRANCE');
                //this.add(portal);
                this.entrancePortal = portal;
                this.portals.push(portal);
            };
            Room.EmptyRoom = new Room("EMPTYROOM");
            return Room;
        })();
        room.Room = Room;
    })(room = wm.room || (wm.room = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var verse;
    (function (verse) {
        var VerseControls = (function () {
            function VerseControls(camera, roomCoordinator) {
                var _this = this;
                //Time of last frame
                this.time = performance.now();
                this.moveToRoom = function (fromRoom, room, position) {
                    if (position === void 0) { position = new THREE.Matrix4(); }
                    fromRoom.scene.remove(_this.cameraObject);
                    room.add(_this.cameraObject);
                    _this.cameraObject.position.setFromMatrixPosition(position);
                };
                this.camera = camera;
                this.controls = new wm.PointerLockControls(camera);
                this.cameraObject = this.controls.getObject();
                new wm.PointerLock(this.controls);
                roomCoordinator.onRoomSwitch.add(this.moveToRoom);
            }
            VerseControls.prototype.update = function () {
                var dt = performance.now() - this.time;
                dt = Math.min(50, dt); //Minimum controls update FPS, 20
                this.controls.update(dt);
                this.time = performance.now();
            };
            VerseControls.prototype.checkPortalIntersection = function (room) {
                var currentPos = this.cameraObject.position.clone();
                if (this.prevPos) {
                    for (var i = 0; i < room.portals.length; i++) {
                        if (room.portals[i].checkIntersection(this.prevPos, currentPos)) {
                            this.prevPos = this.cameraObject.position.clone();
                            return room.portals[i];
                        }
                    }
                }
                this.prevPos = this.cameraObject.position.clone();
                return null;
            };
            return VerseControls;
        })();
        verse.VerseControls = VerseControls;
    })(verse = wm.verse || (wm.verse = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var multi;
    (function (multi) {
        var PositionBroadcaster = (function () {
            function PositionBroadcaster() {
            }
            PositionBroadcaster.start = function (object, p2p) {
                window.setInterval(this.broadcastPosition, this.interval, object, p2p);
            };
            PositionBroadcaster.broadcastPosition = function (object, p2p) {
                var pos = {
                    t: 'p',
                    ts: Date.now(),
                    x: object.position.x,
                    y: object.position.y,
                    z: object.position.z,
                    ry: object.rotation.y
                };
                p2p.broadcastUnreliable(pos);
            };
            PositionBroadcaster.interval = 50;
            return PositionBroadcaster;
        })();
        multi.PositionBroadcaster = PositionBroadcaster;
    })(multi = wm.multi || (wm.multi = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var multi;
    (function (multi) {
        /**
         * Creates new avatars, calls interpolation/extrapolation of these meshes on update.
        **/
        var RemoteAvatarWatcher = (function () {
            function RemoteAvatarWatcher(remoteUserState, p2p, roomState) {
                var _this = this;
                this.moveAvatar = function (from, to, userId) {
                    console.log("Moving user " + userId + " from " + from + " to " + to);
                    var avatar = _this.remoteUserState.getAvatarForId(userId);
                    if (!avatar) {
                        throw "Trying to move non-existant avatar to some other room";
                    }
                    if (_this.roomState.roomDictionary[from]) {
                        //console.log("Removed from " + from);
                        _this.roomState.roomDictionary[from].remove(avatar.mesh);
                    }
                    _this.remoteUserState.userIdRoomMap[userId] = to;
                    var room = _this.roomState.roomDictionary[to];
                    if (room) {
                        room.add(avatar.mesh);
                    }
                    else {
                        console.warn("Avatar moved to not yet loaded room, handling this is to be implemented");
                    }
                };
                this.destroyAvatar = function (userId) {
                    var avatar = _this.remoteUserState.getAvatarForId(userId);
                    var roomId = _this.remoteUserState.userIdRoomMap[userId];
                    //User is in a room
                    if (roomId) {
                        var room = _this.roomState.roomDictionary[roomId];
                        if (room) {
                            room.remove(avatar.mesh);
                        }
                        delete _this.remoteUserState.userIdRoomMap[userId];
                    }
                };
                this.remoteUserState = remoteUserState;
                this.roomState = roomState;
                this.init(p2p);
            }
            RemoteAvatarWatcher.prototype.init = function (p2p) {
                var _this = this;
                p2p.onNewConnection.add(function (con) {
                    var id = con.id;
                    var mesh = _this.createAvatarMesh(id);
                    var avatar = new wm.network.NetworkedMesh(mesh);
                    //Add new avatar to model
                    _this.remoteUserState.setAvatarForId(id, avatar);
                    //Listen for packets (position packets)
                    con.onReceiveUnreliable.add(avatar.receivePosition);
                    con.onDestroy.add(function () {
                        var id = con.id;
                        con.onReceiveUnreliable.remove(_this.remoteUserState.getAvatarForId(id).receivePosition);
                        _this.remoteUserState.destroyAvatarForId(id);
                    });
                });
                this.remoteUserState.onRemoteUserRoomSwitch.add(this.moveAvatar);
                this.remoteUserState.onAvatarDestroy.add(this.destroyAvatar);
            };
            RemoteAvatarWatcher.prototype.createAvatarMesh = function (id) {
                var mesh = new THREE.Mesh(new THREE.BoxGeometry(8, 16, 8));
                mesh.name = id + "AVATAR";
                return mesh;
            };
            RemoteAvatarWatcher.prototype.update = function () {
                for (var id in this.remoteUserState.avatars) {
                    this.remoteUserState.avatars[id].update();
                }
            };
            return RemoteAvatarWatcher;
        })();
        multi.RemoteAvatarWatcher = RemoteAvatarWatcher;
    })(multi = wm.multi || (wm.multi = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var multi;
    (function (multi) {
        /**
         * Communicates to other users when new rooms are entered by user.
         * Also receives these messages.
         */
        var RoomCommunicator = (function () {
            function RoomCommunicator(remoteUserState, p2p, roomState) {
                var _this = this;
                this.handleRoomTransferPacket = function (packet, connection) {
                    if (packet.t != 'roomswitch')
                        return; //Not a roomswitch packet
                    _this.remoteUserState.onRemoteUserRoomSwitch.trigger(packet.prevRoom, packet.newRoom, connection.id);
                };
                this.broadcastRoomTransfer = function (prevRoom, newRoom, pos) {
                    var packet = {
                        t: 'roomswitch',
                        prevRoom: prevRoom.id,
                        newRoom: newRoom.id
                    };
                    _this.p2p.broadcastReliable(packet);
                };
                this.sendCurrentRoom = function (connection) {
                    var currentRoom = _this.roomState.currentRoom;
                    var packet = {
                        t: 'roomswitch',
                        prevRoom: 'None',
                        newRoom: currentRoom.id
                    };
                    connection.sendReliable(packet);
                };
                this.p2p = p2p;
                this.remoteUserState = remoteUserState;
                this.roomState = roomState;
                this.init();
            }
            RoomCommunicator.prototype.init = function () {
                this.roomState.onRoomSwitch.add(this.broadcastRoomTransfer);
                this.p2p.onReceiveReliable.add(this.handleRoomTransferPacket);
                this.p2p.onNewConnection.add(this.sendCurrentRoom);
            };
            return RoomCommunicator;
        })();
        multi.RoomCommunicator = RoomCommunicator;
    })(multi = wm.multi || (wm.multi = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var multi;
    (function (multi) {
        var RemoteUserState = (function () {
            function RemoteUserState() {
                this.onAvatarDestroy = new events.TypedEvent();
                this.onRemoteUserRoomSwitch = new events.TypedEvent();
                this.avatars = {};
                this.userIdRoomMap = {};
            }
            RemoteUserState.prototype.setAvatarForId = function (id, avatar) {
                this.avatars[id] = avatar;
            };
            RemoteUserState.prototype.getAvatarForId = function (id) {
                return this.avatars[id];
            };
            RemoteUserState.prototype.destroyAvatarForId = function (id) {
                this.onAvatarDestroy.trigger(id);
                delete this.avatars[id];
            };
            return RemoteUserState;
        })();
        multi.RemoteUserState = RemoteUserState;
    })(multi = wm.multi || (wm.multi = {}));
})(wm || (wm = {}));
/// <reference path="positionbroadcaster.ts" />
/// <reference path="remoteavatarwatcher.ts" />
/// <reference path="roomcommunicator.ts" />
/// <reference path="remoteuserstate.ts" />
var wm;
(function (wm) {
    var multi;
    (function (multi) {
        var MultiUserClient = (function () {
            function MultiUserClient(roomState, controls) {
                var _this = this;
                this.remoteUserState = new multi.RemoteUserState();
                this.networkClient = new wm.network.NetworkClient();
                this.remoteAvatarWatcher = new multi.RemoteAvatarWatcher(this.remoteUserState, this.networkClient.p2p, roomState);
                this.roomCommunicator = new multi.RoomCommunicator(this.remoteUserState, this.networkClient.p2p, roomState);
                //Clear movement history when moving through portals
                this.remoteUserState.onRemoteUserRoomSwitch.add(function (from, to, id) { return _this.remoteUserState.getAvatarForId(id).clearBuffer(); });
                //Start broadcasting position
                multi.PositionBroadcaster.start(controls.cameraObject, this.networkClient.p2p);
            }
            MultiUserClient.prototype.update = function () {
                this.remoteAvatarWatcher.update();
            };
            return MultiUserClient;
        })();
        multi.MultiUserClient = MultiUserClient;
    })(multi = wm.multi || (wm.multi = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var room;
    (function (room_1) {
        var Portal = wm.verse.Portal;
        var DebugRoomGenerator = (function () {
            function DebugRoomGenerator() {
            }
            DebugRoomGenerator.prototype.generateRoomFromURL = function (url) {
                if (url == 'debug1') {
                    return this.createDebugRoom1();
                }
                else {
                    return this.createDebugRoom2();
                }
            };
            DebugRoomGenerator.prototype.createDebugRoom1 = function () {
                var room = new room_1.Room('debug1');
                var grid = new THREE.GridHelper(100, 10);
                room.add(grid);
                var g = new THREE.BoxGeometry(60, 20, 10);
                var m = new THREE.MeshNormalMaterial();
                var cube = new THREE.Mesh(g, m);
                cube.position.set(0, 10, -65);
                room.add(cube);
                var g2 = new THREE.IcosahedronGeometry(50, 2);
                var m2 = new THREE.MeshNormalMaterial();
                var obj2 = new THREE.Mesh(g2, m2);
                obj2.position.set(0, 10, 95);
                room.add(obj2);
                var portal = new Portal('debug2');
                portal.position.x = -40;
                portal.position.z = -80;
                portal.updateMatrix();
                room.portals.push(portal);
                return room;
            };
            DebugRoomGenerator.prototype.createDebugRoom2 = function () {
                var room = new room_1.Room('debug2');
                var g = new THREE.BoxGeometry(60, 20, 10);
                var m = new THREE.MeshPhongMaterial();
                var cube = new THREE.Mesh(g, m);
                cube.position.set(0, 10, -95);
                room.add(cube);
                var sphereGeom = new THREE.SphereGeometry(10);
                var sphereMat = new THREE.MeshBasicMaterial({ color: 0x20F020 });
                var sphere = new THREE.Mesh(sphereGeom, sphereMat);
                sphere.position.x = 50;
                sphere.updateMatrix();
                sphereMat.side = THREE.BackSide;
                room.add(sphere);
                var sphereMat2 = new THREE.MeshBasicMaterial({ color: 0xF0F020 });
                var sphere2 = new THREE.Mesh(sphereGeom, sphereMat2);
                sphere2.position.x = -50;
                sphere2.updateMatrix();
                room.add(sphere2);
                var light = new THREE.DirectionalLight(0xffffff, 2);
                var light2 = new THREE.AmbientLight(0x303030);
                light.position.set(1, 1, 1).normalize();
                room.add(light);
                room.add(light2);
                var grid = new THREE.GridHelper(100, 10);
                grid.setColors(0xff0000, 0x00aacc);
                room.add(grid);
                var portal = new Portal('debug1');
                portal.rotateY(Math.PI);
                portal.position.x = 80;
                room.portals.push(portal);
                portal.updateMatrix();
                return room;
            };
            return DebugRoomGenerator;
        })();
        room_1.DebugRoomGenerator = DebugRoomGenerator;
    })(room = wm.room || (wm.room = {}));
})(wm || (wm = {}));
/// <reference path="roomgenerator.ts"/>
var wm;
(function (wm) {
    var room;
    (function (room) {
        var RoomLoader = (function () {
            function RoomLoader() {
            }
            RoomLoader.prototype.loadRoom = function (url) {
                if (this.stringStartsWith(url, 'debug')) {
                    var gen = new room.DebugRoomGenerator();
                    return gen.generateRoomFromURL(url);
                }
                return null;
            };
            RoomLoader.prototype.stringStartsWith = function (text, target) {
                return text.lastIndexOf(target, 0) === 0;
            };
            return RoomLoader;
        })();
        room.RoomLoader = RoomLoader;
    })(room = wm.room || (wm.room = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var room;
    (function (room_2) {
        /**
        * Links the portals in rooms together upon loading a room.
        */
        var RoomLinker = (function () {
            function RoomLinker() {
            }
            RoomLinker.introduceRoom = function (newRoom, rooms, roomDictionary) {
                var _this = this;
                //Link new room's portals
                newRoom.portals.forEach(function (portal) {
                    if (roomDictionary[portal.toRoomId]) {
                        _this.linkPortalToRoom(newRoom, portal, roomDictionary[portal.toRoomId]);
                    }
                });
                //Link existing rooms
                rooms.forEach(function (room) {
                    return room.portals.forEach(function (portal) {
                        if (portal.toRoomId == newRoom.id && !portal.isLinked()) {
                            _this.linkPortalToRoom(room, portal, roomDictionary[portal.toRoomId]);
                        }
                    });
                });
            };
            RoomLinker.linkPortalToRoom = function (fromRoom, portal, room) {
                if (!room.entrancePortal) {
                    room.addEntrancePortal(); //Lazily add entrance portal
                }
                portal.setToPortal(room.entrancePortal, room);
                room.entrancePortal.setToPortal(portal, fromRoom);
            };
            return RoomLinker;
        })();
        room_2.RoomLinker = RoomLinker;
    })(room = wm.room || (wm.room = {}));
})(wm || (wm = {}));
/// <reference path="../room/roomloader.ts" />
/// <reference path="../room/roomlinker.ts" />
var wm;
(function (wm) {
    var verse;
    (function (verse) {
        var Room = wm.room.Room;
        /**
         * Contains room state and methods for switching to and loading other rooms.
         */
        var RoomState = (function () {
            function RoomState() {
                this.currentRoom = Room.EmptyRoom;
                this.onRoomSwitch = new events.TypedEvent();
                this.rooms = [];
                this.roomDictionary = {};
                this.loader = new wm.room.RoomLoader();
            }
            RoomState.prototype.switchToRoomWithId = function (id) {
                if (!this.roomDictionary[id]) {
                    throw 'Room "' + id + '" has not been loaded!';
                }
                this.switchToRoom(this.roomDictionary[id]);
            };
            RoomState.prototype.isLoaded = function (roomId) {
                return this.roomDictionary[roomId] ? true : false;
            };
            RoomState.prototype.switchToRoom = function (room, positionInNewRoom) {
                if (positionInNewRoom === void 0) { positionInNewRoom = new THREE.Matrix4(); }
                var previousRoom = this.currentRoom;
                this.currentRoom = room;
                this.onRoomSwitch.trigger(previousRoom, room, positionInNewRoom);
            };
            RoomState.prototype.loadRoom = function (url) {
                var room = this.loader.loadRoom(url);
                if (room.id) {
                    var id = room.id;
                }
                else {
                    var id = wm.urlToId(url);
                }
                if (this.isLoaded(id)) {
                    throw 'Room "' + id + '" has already been loaded!';
                }
                var room = this.loader.loadRoom(url);
                this.rooms.push(room);
                this.roomDictionary[id] = room;
                wm.room.RoomLinker.introduceRoom(room, this.rooms, this.roomDictionary);
            };
            return RoomState;
        })();
        verse.RoomState = RoomState;
    })(verse = wm.verse || (wm.verse = {}));
})(wm || (wm = {}));
/// <reference path="../verse/verseclient.ts" />
var wm;
(function (wm) {
    var ui;
    (function (ui) {
        var UserInterface = (function () {
            function UserInterface(client) {
                var multiplayer = client.multiUserClient;
                this.initChatUI(multiplayer);
            }
            UserInterface.prototype.initChatUI = function (multi) {
                var el = document.querySelector('#wmchat');
                var chat = multi.networkClient.chat;
                var username = multi.networkClient.localId;
                if (!el) {
                    console.warn('There appears to be no Chat UI, aborting linking up with it');
                    return;
                }
                chat.onReceiveChat.add(function (data, sender) {
                    el.messages.push({ user: sender, message: data.msg });
                });
                el.addEventListener('chat', function (event) {
                    var message = event.detail.msg;
                    chat.sendChat(message);
                    //Show my own chat message
                    el.appendMessage(username, message);
                });
            };
            return UserInterface;
        })();
        ui.UserInterface = UserInterface;
    })(ui = wm.ui || (wm.ui = {}));
})(wm || (wm = {}));
/// <reference path="../room/room.ts" />
/// <reference path="portal.ts" />
/// <reference path="versecontrols.ts" />
/// <reference path="../multi/multiuserclient.ts" />
/// <reference path="roomstate.ts" />
/// <reference path="../ui/userinterface.ts" />
var wm;
(function (wm) {
    var verse;
    (function (verse) {
        var VerseClient = (function () {
            function VerseClient(renderer) {
                var _this = this;
                this.onWindowResize = function (event) {
                    _this.camera.aspect = window.innerWidth / window.innerHeight;
                    _this.camera.updateProjectionMatrix();
                    _this.renderer.setSize(window.innerWidth, window.innerHeight);
                };
                this.renderer = renderer;
                this.gl = this.renderer.context;
                var aspect = window.innerWidth / window.innerHeight;
                this.camera = new THREE.PerspectiveCamera(70, aspect, 0.001, 2000);
                this.roomState = new verse.RoomState();
                this.controls = new verse.VerseControls(this.camera, this.roomState);
                window.addEventListener('resize', this.onWindowResize);
                this.multiUserClient = new wm.multi.MultiUserClient(this.roomState, this.controls);
                this.userInterface = new wm.ui.UserInterface(this);
            }
            VerseClient.prototype.update = function () {
                this.controls.update();
                this.multiUserClient.update();
                var intersectedPortal = this.controls.checkPortalIntersection(this.roomState.currentRoom);
                if (intersectedPortal) {
                    this.moveThroughPortal(intersectedPortal);
                }
                this.render();
            };
            VerseClient.prototype.render = function () {
                this.roomState.currentRoom.render(this.gl, this.renderer, this.camera);
            };
            VerseClient.prototype.moveThroughPortal = function (portal) {
                var otherEndPortal = portal.toPortal;
                //Ensure that the portal that was just moved through points to the portal we entered
                // (So we could turn around and go back)
                otherEndPortal.setToPortal(portal, this.roomState.currentRoom);
                otherEndPortal.toPortal;
                //TODO remove the necessity of moving portals around to match rotation.
                //Requires fix of rendering
                otherEndPortal.rotation.setFromQuaternion(portal.quaternion);
                otherEndPortal.rotateY(Math.PI);
                var roomId = portal.toRoomId;
                var room = this.roomState.roomDictionary[roomId];
                var where = portal.getPortalViewMatrix(this.controls.camera.matrixWorld);
                this.roomState.switchToRoom(room, where);
            };
            return VerseClient;
        })();
        verse.VerseClient = VerseClient;
    })(verse = wm.verse || (wm.verse = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var network;
    (function (network) {
        var ChatClient = (function () {
            function ChatClient(p2p) {
                var _this = this;
                this.onReceiveChat = new events.TypedEvent();
                this.chatlog = Minilog('WM.Chat');
                this.onReceiveReliable = function (data, nConnection) {
                    if (data.t == 'chat') {
                        var sender = nConnection.id;
                        network.mlog.log("Received chat message: " + data.msg + " from " + sender);
                        _this.chatlog.log(sender + ": " + data.msg);
                        _this.onReceiveChat.trigger(data, sender);
                    }
                };
                this.p2p = p2p;
                p2p.onReceiveReliable.add(this.onReceiveReliable);
            }
            ChatClient.prototype.sendChat = function (message) {
                this.sendChatPacket({ t: 'chat', msg: message });
                network.mlog.log("Sent chat message: " + message);
                this.chatlog.log("me : " + message);
            };
            ChatClient.prototype.sendChatPacket = function (packet) {
                this.p2p.broadcastReliable(packet);
            };
            return ChatClient;
        })();
        network.ChatClient = ChatClient;
    })(network = wm.network || (wm.network = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var network;
    (function (network) {
        var NetworkConnection = (function () {
            function NetworkConnection(peer) {
                var _this = this;
                this.onReceive = new events.TypedEvent();
                this.onReceiveReliable = new events.TypedEvent();
                this.onReceiveUnreliable = new events.TypedEvent();
                this.onDestroy = new events.TypedEvent();
                this.unreliableOpen = false;
                this.reliableOpen = false;
                this.preOpenMessageBuffer = [];
                this.addChannel = function (channel, reliable) {
                    channel.onOpen.add(function () {
                        if (reliable) {
                            _this.reliable = channel;
                            _this.reliableOpen = true;
                            _this.reliable.onMessage.add(_this._onReceiveReliable);
                            _this.sendBufferedMessages();
                        }
                        else {
                            _this.unreliable = channel;
                            _this.unreliableOpen = true;
                            _this.unreliable.onMessage.add(_this._onReceiveUnreliable);
                        }
                    });
                };
                this._onReceiveReliable = function (data) {
                    _this.onReceiveReliable.trigger(data);
                    console.log("received data: ", data);
                    _this.onReceive.trigger(data, false);
                };
                this._onReceiveUnreliable = function (data) {
                    _this.onReceiveUnreliable.trigger(data);
                    _this.onReceive.trigger(data, false);
                };
                this.peer = peer;
                this.peer.onDataChannelReceive.add(function (channel) {
                    if (channel.label == 'reliable') {
                        _this.addChannel(channel, true);
                    }
                    else if (channel.label == 'unreliable') {
                        _this.addChannel(channel, false);
                    }
                });
                this.peer.onClose.add(function () { return _this.destroy; });
            }
            Object.defineProperty(NetworkConnection.prototype, "id", {
                get: function () {
                    return this.peer.id;
                },
                enumerable: true,
                configurable: true
            });
            NetworkConnection.prototype.createDefaultChannels = function () {
                var rchan = this.peer.createDataChannel('reliable', { reliable: true });
                this.addChannel(rchan, true);
                var uchan = this.peer.createDataChannel('unreliable', { reliable: false });
                this.addChannel(uchan, false);
            };
            NetworkConnection.prototype.sendReliable = function (data) {
                if (this.reliableOpen) {
                    this.reliable.send(data);
                }
                else {
                    this.preOpenMessageBuffer.push(data);
                }
            };
            NetworkConnection.prototype.sendUnreliable = function (data) {
                if (this.unreliableOpen) {
                    this.unreliable.send(data);
                }
            };
            NetworkConnection.prototype.sendBufferedMessages = function () {
                for (var i = 0; i < this.preOpenMessageBuffer.length; i++) {
                    this.sendReliable(this.preOpenMessageBuffer[i]);
                }
                this.preOpenMessageBuffer = [];
            };
            NetworkConnection.prototype.destroy = function () {
                console.log("Destroying connection " + this.id);
                this.onDestroy.trigger();
                this.reliableOpen = false;
                this.unreliableOpen = false;
                //TODO Close connection gracefully
            };
            return NetworkConnection;
        })();
        network.NetworkConnection = NetworkConnection;
    })(network = wm.network || (wm.network = {}));
})(wm || (wm = {}));
/**
* Author Guido Zuidhof / http://guido.io
*/
var DS;
(function (DS) {
    /**
    * Circular buffer
    * Data structure that uses a single, fixed-size buffer.
    * A new entry overwrites the oldest entry when the buffer is full.
    */
    var CircularBuffer = (function () {
        //         [ 5, 6, 7, 1, 2, 3, 4]
        //                 |     
        //               pointer = 2      
        function CircularBuffer(length) {
            this.buffer = [];
            this.buffer.length = length;
            this.pointer = 0;
        }
        CircularBuffer.prototype.push = function (element) {
            this.pointer = (this.pointer + 1) % this.buffer.length;
            this.buffer[this.pointer] = element;
        };
        CircularBuffer.prototype.get = function (index) {
            return this.buffer[index];
        };
        CircularBuffer.prototype.getNewest = function () {
            return this.buffer[this.pointer];
        };
        CircularBuffer.prototype.clear = function () {
            var length = this.buffer.length;
            this.buffer = [];
            this.buffer.length = length;
        };
        return CircularBuffer;
    })();
    DS.CircularBuffer = CircularBuffer;
})(DS || (DS = {}));
/// <reference path="../ds/circularbuffer.ts"/>
var wm;
(function (wm) {
    var network;
    (function (network) {
        var StateBuffer = (function (_super) {
            __extends(StateBuffer, _super);
            function StateBuffer() {
                _super.apply(this, arguments);
            }
            /**
            * Returns the state before given index, so if index is 1, it returns state at index 0.
            */
            StateBuffer.prototype.getBeforeIndex = function (index) {
                return this.buffer[(this.buffer.length + index - 1) % this.buffer.length];
            };
            /**
            * Returns the state before timestamp, null if not present.
            * Optional: index parameter, start searching from this index.
            */
            StateBuffer.prototype.getBeforeTimestamp = function (timestamp, index) {
                if (index === void 0) { index = this.pointer; }
                do {
                    if (this.buffer[index] && this.buffer[index].time < timestamp) {
                        return this.buffer[index];
                    }
                    index = (this.buffer.length + index - 1) % this.buffer.length;
                } while (index != this.pointer);
                return null;
            };
            /**
            * Returns the index of state that is shortest after timestamp, latest if not present.
            * Note that latest may not actually be after given timestamp!
            */
            StateBuffer.prototype.getShortestAfterTimestampIndex = function (timestamp, fixTimeStepCallback) {
                var index = this.pointer;
                var prev = index;
                do {
                    if (!this.getBeforeIndex(index) || this.getBeforeIndex(index).time < timestamp) {
                        return index;
                    }
                    prev = index;
                    index = (this.buffer.length + index - 1) % this.buffer.length;
                } while (index != this.pointer);
                network.mlog.info("Way out of sync, probably unsynced clocks, your clock is likely ahead, will attempt fix.");
                fixTimeStepCallback();
                return prev;
            };
            StateBuffer.prototype.getBeforeState = function (state) {
                return this.getBeforeTimestamp(state.time);
            };
            return StateBuffer;
        })(DS.CircularBuffer);
        network.StateBuffer = StateBuffer;
    })(network = wm.network || (wm.network = {}));
})(wm || (wm = {}));
/// <reference path="statebuffer.ts"/>
var wm;
(function (wm) {
    var network;
    (function (network) {
        var NetworkedMesh = (function () {
            function NetworkedMesh(mesh) {
                var _this = this;
                this.interpolationBacktime = -10000; //Some random value, which forces clients to resync even though clocks are very close.
                this.lastPacketReceivedLocalTime = 0;
                this.optimizeInterpolationBacktime = function () {
                    var newest = _this.buffer.getNewest();
                    //If we have received a packet, ever, and this isn't likely package loss causing the big discrepancy
                    if (newest && Date.now() - _this.lastPacketReceivedLocalTime < NetworkedMesh.expectedPacketInterval * 3) {
                        var oldInterpBacktime = _this.interpolationBacktime;
                        network.mlog.warn("Attempting to estimate a good interpolation backtime");
                        _this.interpolationBacktime = Date.now() - newest.time + 2 * NetworkedMesh.expectedPacketInterval; //With 0 ms ping, approx 100ms backtime.
                        //With 100 ms ping, 200 ms backtime. Simple! 
                        network.mlog.warn("Now set to " + _this.interpolationBacktime + " from " + oldInterpBacktime);
                    }
                };
                this.receivePosition = function (data) {
                    if (data.t != 'p')
                        return; //Not a position packet
                    //console.log("Received position packet ", data);
                    if (_this.buffer.getNewest() && _this.buffer.getNewest().time > data.ts) {
                        network.mlog.log("Already have a newer state, inserting is not worth the effort, discarding");
                        //It does however still hold value, as it allows for more precise interpolation.
                        return;
                    }
                    _this.lastPacketReceivedLocalTime = Date.now();
                    var state = {
                        time: data.ts,
                        pos: new THREE.Vector3(data.x, data.y, data.z),
                        rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, data.ry, 0)),
                        vel: new THREE.Vector3() //To be set if velocity is known
                    };
                    var before = _this.buffer.getBeforeState(state);
                    if (before) {
                        var timeDifference = state.time - before.time;
                        var positionDifference = new THREE.Vector3().subVectors(state.pos, before.pos);
                        state.vel = positionDifference.divideScalar(timeDifference);
                    }
                    _this.buffer.push(state);
                };
                this.mesh = mesh;
                this.buffer = new network.StateBuffer(6);
            }
            NetworkedMesh.prototype.update = function () {
                var interpTime = Date.now() - this.interpolationBacktime;
                var newest = this.buffer.getNewest();
                if (!newest) {
                    return;
                }
                if (interpTime < newest.time) {
                    //This interpolation should extrapolate backwards, but it doesn't.
                    //I think that for this one second right after we can use a newer position instead of predicting
                    //where the networked mesh WAS (and not where it is going to be like in the else case).
                    var stateAfterIndex = this.buffer.getShortestAfterTimestampIndex(interpTime, this.optimizeInterpolationBacktime);
                    var stateBefore = this.buffer.getBeforeIndex(stateAfterIndex);
                    var stateAfter = this.buffer.get(stateAfterIndex);
                    if (!stateBefore) {
                        stateBefore = stateAfter;
                    }
                    var timeDiff = stateAfter.time - stateBefore.time;
                    var alpha = 0;
                    if (timeDiff > 0.0005) {
                        alpha = (interpTime - stateBefore.time) / timeDiff;
                    }
                    //console.log("Interpolating between " + stateBefore.time + " | " + stateAfter.time);
                    this.mesh.position.copy(stateBefore.pos).lerp(stateAfter.pos, alpha);
                    this.mesh.quaternion.copy(stateBefore.rot).slerp(stateAfter.rot, alpha);
                    this.mesh.updateMatrix();
                }
                else {
                    var extrapolationTime = interpTime - newest.time;
                    if (extrapolationTime < 420) {
                        this.mesh.position.copy(newest.pos).add(newest.vel.clone().multiplyScalar(extrapolationTime)); //pos = newestPos + newestVel * timeElapsed
                        this.mesh.setRotationFromQuaternion(newest.rot);
                        //see if we can do better anyhow
                        if (extrapolationTime > 210) {
                            this.optimizeInterpolationBacktime();
                        }
                    }
                    else {
                        this.mesh.position.set(newest.pos.x, newest.pos.y, newest.pos.z);
                        this.mesh.setRotationFromQuaternion(newest.rot);
                        //Maybe the clocks are way off.
                        this.optimizeInterpolationBacktime();
                    }
                }
            };
            NetworkedMesh.prototype.clearBuffer = function () {
                this.buffer.clear();
            };
            //How long in the past other people are shown.
            //Should really, at minimum be position-send-interval + ping to user.
            //Higher is safer, although people are looking further into the past.
            //Too high with a buffer that is too small means there may be no packet to that is older than
            //the time it is trying to predict. Which you really don't want.
            NetworkedMesh.expectedPacketInterval = 3 / 60 * 1000; //20 per second, 50ms.
            return NetworkedMesh;
        })();
        network.NetworkedMesh = NetworkedMesh;
    })(network = wm.network || (wm.network = {}));
})(wm || (wm = {}));
var events;
(function (events) {
    var TypedEvent = (function () {
        function TypedEvent() {
            // Private member vars
            this._listeners = [];
        }
        TypedEvent.prototype.add = function (listener) {
            /// <summary>Registers a new listener for the event.</summary>
            /// <param name="listener">The callback function to register.</param>
            this._listeners.push(listener);
        };
        TypedEvent.prototype.remove = function (listener) {
            /// <summary>Unregisters a listener from the event.</summary>
            /// <param name="listener">The callback function that was registered. If missing then all listeners will be removed.</param>
            if (typeof listener === 'function') {
                for (var i = 0, l = this._listeners.length; i < l; i++) {
                    if (this._listeners[i] === listener) {
                        this._listeners.splice(i, 1);
                        break;
                    }
                }
            }
            else {
                this._listeners = [];
            }
        };
        TypedEvent.prototype.trigger = function () {
            var a = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                a[_i - 0] = arguments[_i];
            }
            /// <summary>Invokes all of the listeners for this event.</summary>
            /// <param name="args">Optional set of arguments to pass to listners.</param>
            var context = {};
            var listeners = this._listeners.slice(0);
            for (var i = 0, l = listeners.length; i < l; i++) {
                listeners[i].apply(context, a || []);
            }
        };
        return TypedEvent;
    })();
    events.TypedEvent = TypedEvent;
})(events || (events = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="networkclient.ts"/>
/// <reference path="networkconnection.ts"/>
/// <reference path="networkedmesh.ts"/>
/// <reference path="../event/event.ts"/>
var nc; //FIXME Debug variable, remove later!
var wm;
(function (wm) {
    var network;
    (function (network) {
        var P2PNetworkClient = (function () {
            function P2PNetworkClient(networkClient) {
                var _this = this;
                this.onNewConnection = new events.TypedEvent();
                this.onConnectionClose = new events.TypedEvent();
                this.onReceiveReliable = new events.TypedEvent();
                this.onReceiveUnreliable = new events.TypedEvent();
                this.connectToPeers = function (peers) {
                    for (var i = 0; i < peers.length; i++) {
                        network.mlog.log("Connecting to peers");
                        if (peers[i] != _this.networkClient.localId) {
                            _this.connectToPeer(peers[i]);
                        }
                    }
                };
                this.onConnectionClosed = function (connection) {
                    network.mlog.log("Connection closed to " + connection.id);
                    if (_this.connections[connection.id]) {
                        _this.onConnectionClose.trigger(_this.connections[connection.id]);
                        _this.connections[connection.id].destroy();
                        delete _this.connections[connection.id];
                    }
                };
                this.networkClient = networkClient;
                this.connections = {};
            }
            Object.defineProperty(P2PNetworkClient.prototype, "excess", {
                get: function () {
                    return this.networkClient.excess;
                },
                enumerable: true,
                configurable: true
            });
            P2PNetworkClient.prototype.init = function () {
                var _this = this;
                this.excess.onConnection.add(function (peer) {
                    console.log("New connection added " + peer.id);
                    var connection = _this.wrapConnection(peer);
                    _this.onNewConnection.trigger(connection);
                });
                nc = this;
            };
            /**
            * Transmit reliably to all connected peers
            * @param data to transmit (JSON), should have a field 't' with the type.
            */
            P2PNetworkClient.prototype.broadcastReliable = function (data) {
                for (var id in this.connections) {
                    this.connections[id].sendReliable(data);
                }
            };
            /**
            * Transmit unreliably to all connected peers
            * Do not rely on these packages arriving or being in order!
            * @param data to transmit (JSON), must have a field 't' with the type.
            */
            P2PNetworkClient.prototype.broadcastUnreliable = function (data) {
                for (var id in this.connections) {
                    this.connections[id].sendUnreliable(data);
                }
            };
            P2PNetworkClient.prototype.connectToPeer = function (id) {
                network.mlog.log("Establishing reliable connection to peer " + id);
                var peer = this.excess.connect(id);
                var connection = this.wrapConnection(peer);
                connection.createDefaultChannels();
                this.onNewConnection.trigger(connection);
            };
            P2PNetworkClient.prototype.wrapConnection = function (peer) {
                var _this = this;
                var connection = new network.NetworkConnection(peer);
                network.mlog.log("Connecting to " + connection.id);
                connection.peer.onClose.add(function () { return _this.onConnectionClosed(connection); });
                this.connections[connection.id] = connection;
                connection.onReceiveReliable.add(function (data) { _this.onReceiveReliable.trigger(data, connection); });
                connection.onReceiveUnreliable.add(function (data) { _this.onReceiveUnreliable.trigger(data, connection); });
                return connection;
            };
            return P2PNetworkClient;
        })();
        network.P2PNetworkClient = P2PNetworkClient;
    })(network = wm.network || (wm.network = {}));
})(wm || (wm = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../typings/minilog/Minilog.d.ts"/>
/// <reference path="chatclient.ts"/>
/// <reference path="p2pnetworkclient.ts"/>
/// <reference path="../typings/excess/excess.d.ts" />
var wm;
(function (wm) {
    var network;
    (function (network) {
        network.mlog = Minilog('WM.Network');
        Minilog.suggest.deny('WM.Network', 'warn');
        Minilog.enable();
        var NetworkClient = (function () {
            function NetworkClient() {
                var _this = this;
                this.connect = function (peers) {
                    var id = _this.localId;
                    network.mlog.log("Connecting with id " + id + ", available peers: " + peers);
                    _this.p2p.connectToPeers(peers);
                };
                this.onConnectedToServer = function (id) {
                    network.mlog.log("Connected to central server with ID: " + id);
                };
                this.onDisconnectedFromServer = function () {
                    network.mlog.log("Disconnected from central server");
                };
                this.server = {
                    host: 'webvr.rocks',
                    port: 4000,
                    apipath: '/excess',
                };
                this.p2p = new network.P2PNetworkClient(this);
                this.chat = new network.ChatClient(this.p2p);
                this.localId = this.generateId();
                this.init();
                this.p2p.init();
            }
            NetworkClient.prototype.init = function () {
                var _this = this;
                var ice = [
                    { 'url': 'stun:stun4.l.google.com:19302' },
                    { 'url': 'stun:stun.l.google.com:19302' },
                    { 'url': 'stun.stunprotocol.org:3478' },
                    { 'url': 'stun.stunserver.org' },
                    { 'url': "stun.voipbuster.com" },
                    { 'url': "stun.voipstunt.com" },
                    { 'url': "stun.voxgratia.org" }
                ];
                var endPoint = '//' + this.server.host + ':' + this.server.port + this.server.apipath;
                this.excess = new excess.ExcessClient(endPoint, this.localId /*, ice*/);
                this.excess.connectToServer().then(function () {
                    console.log("Connected to signalling server with ID", _this.localId);
                    //Temporary testing line
                    _this.joinRoom('debug1');
                }, function () {
                    console.log("Failed to connect to signalling server!");
                });
                window.onunload = window.onbeforeunload = function (e) {
                    if (!!_this.excess /* && !this.excess.destroyed*/) {
                    }
                };
            };
            NetworkClient.prototype.joinRoom = function (roomId) {
                var _this = this;
                console.log("Joining room", roomId);
                this.excess.joinRoom(roomId);
                this.excess.requestRoom(roomId, function (peers) {
                    console.log("Received peers!", peers);
                    _this.connect(peers);
                });
            };
            NetworkClient.prototype.generateId = function () {
                return Math.random().toString(36).substring(7);
            };
            return NetworkClient;
        })();
        network.NetworkClient = NetworkClient;
    })(network = wm.network || (wm.network = {}));
})(wm || (wm = {}));
var wm;
(function (wm) {
    var PointerLock = (function () {
        function PointerLock(controls) {
            this.blocker = document.getElementById('blocker');
            this.instructions = document.getElementById('instructions');
            this.controls = controls;
            this.init();
        }
        PointerLock.prototype.init = function () {
            var _this = this;
            var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
            if (havePointerLock) {
                var element = document.body;
                var pointerlockchange = function (event) {
                    if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element) {
                        _this.controls.enabled = true;
                        _this.blocker.style.display = 'none';
                    }
                    else {
                        _this.controls.enabled = false;
                        _this.blocker.style.display = '-webkit-box';
                        _this.blocker.style.display = '-moz-box';
                        _this.blocker.style.display = 'box';
                        _this.instructions.style.display = '';
                    }
                };
                var pointerlockerror = function (event) {
                    this.instructions.style.display = '';
                    console.log("Pointer lock error!");
                };
                // Hook pointer lock state change events
                document.addEventListener('pointerlockchange', pointerlockchange, false);
                document.addEventListener('mozpointerlockchange', pointerlockchange, false);
                document.addEventListener('webkitpointerlockchange', pointerlockchange, false);
                document.addEventListener('pointerlockerror', pointerlockerror, false);
                document.addEventListener('mozpointerlockerror', pointerlockerror, false);
                document.addEventListener('webkitpointerlockerror', pointerlockerror, false);
                this.instructions.addEventListener('click', function (e) {
                    // Ask the browser to lock the pointer
                    element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
                    element.requestPointerLock();
                }, false);
            }
            else {
                this.instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
            }
        };
        return PointerLock;
    })();
    wm.PointerLock = PointerLock;
})(wm || (wm = {}));
var wm;
(function (wm) {
    /**
    * @author mrdoob / http://mrdoob.com/
    * Altered and translated into ts by Guido
    */
    var PointerLockControls = (function () {
        function PointerLockControls(camera) {
            var _this = this;
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
            this.isOnObject = false;
            this.canJump = false;
            this.enabled = false;
            this.velocity = new THREE.Vector3();
            this.onMouseMove = function (event) {
                if (_this.enabled === false)
                    return;
                var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
                var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
                _this.yawObject.rotation.y -= movementX * 0.002;
                _this.pitchObject.rotation.x -= movementY * 0.002;
                _this.pitchObject.rotation.x = Math.max(-PointerLockControls.PI_2, Math.min(PointerLockControls.PI_2, _this.pitchObject.rotation.x));
            };
            this.onKeyDown = function (event) {
                switch (event.keyCode) {
                    case 38: // up
                    case 87:
                        _this.moveForward = true;
                        break;
                    case 37: // left
                    case 65:
                        _this.moveLeft = true;
                        break;
                    case 40: // down
                    case 83:
                        _this.moveBackward = true;
                        break;
                    case 39: // right
                    case 68:
                        _this.moveRight = true;
                        break;
                    case 32:
                        if (_this.canJump === true)
                            _this.velocity.y += 350;
                        _this.canJump = false;
                        break;
                }
            };
            this.onKeyUp = function (event) {
                switch (event.keyCode) {
                    case 38: // up
                    case 87:
                        _this.moveForward = false;
                        break;
                    case 37: // left
                    case 65:
                        _this.moveLeft = false;
                        break;
                    case 40: // down
                    case 83:
                        _this.moveBackward = false;
                        break;
                    case 39: // right
                    case 68:
                        _this.moveRight = false;
                        break;
                }
            };
            camera.rotation.set(0, 0, 0);
            this.pitchObject = new THREE.Object3D();
            this.pitchObject.add(camera);
            this.yawObject = new THREE.Object3D();
            this.yawObject.position.y = 10;
            this.yawObject.add(this.pitchObject);
            this.initEventListeners();
        }
        PointerLockControls.prototype.initEventListeners = function () {
            document.addEventListener('mousemove', this.onMouseMove, false);
            document.addEventListener('keydown', this.onKeyDown, false);
            document.addEventListener('keyup', this.onKeyUp, false);
        };
        PointerLockControls.prototype.getObject = function () {
            return this.yawObject;
        };
        PointerLockControls.prototype.setOnObject = function (value) {
            this.isOnObject = value;
            this.canJump = value;
        };
        PointerLockControls.prototype.getDirection = function () {
            // assumes the camera itself is not rotated
            var direction = new THREE.Vector3(0, 0, -1);
            var rotation = new THREE.Euler(0, 0, 0, "YXZ");
            return function (v) {
                rotation.set(this.pitchObject.rotation.x, this.yawObject.rotation.y, 0);
                v.copy(direction).applyEuler(rotation);
                return v;
            };
        };
        PointerLockControls.prototype.update = function (dt) {
            var delta = dt / 1000; //Milliseconds to seconds
            if (this.enabled === false)
                return;
            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;
            this.velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
            if (this.moveForward)
                this.velocity.z -= 400.0 * delta;
            if (this.moveBackward)
                this.velocity.z += 400.0 * delta;
            if (this.moveLeft)
                this.velocity.x -= 400.0 * delta;
            if (this.moveRight)
                this.velocity.x += 400.0 * delta;
            if (this.isOnObject === true) {
                this.velocity.y = Math.max(0, this.velocity.y);
            }
            this.yawObject.translateX(this.velocity.x * delta);
            this.yawObject.translateY(this.velocity.y * delta);
            this.yawObject.translateZ(this.velocity.z * delta);
            if (this.yawObject.position.y < 10) {
                this.velocity.y = 0;
                this.yawObject.position.y = 10;
                this.canJump = true;
            }
        };
        PointerLockControls.PI_2 = Math.PI / 2;
        return PointerLockControls;
    })();
    wm.PointerLockControls = PointerLockControls;
})(wm || (wm = {}));
/// <reference path="verse/verseclient.ts" />
/// <reference path="typings/threejs/three.d.ts"/>
/// <reference path="network/networkclient.ts"/>
/// <reference path="verse/portal.ts"/>
/// <reference path="pointerlock.ts"/>
/// <reference path="pointerlockcontrols.ts"/>
/// <reference path="room/room.ts" />
var webmetaverse = null;
var wm;
(function (wm) {
    function urlToId(url) {
        return btoa(url);
    }
    wm.urlToId = urlToId;
    var WebMetaverse = (function () {
        function WebMetaverse() {
            var _this = this;
            this.tick = function () {
                _this.client.update();
                requestAnimationFrame(_this.tick);
            };
            webmetaverse = this;
            var renderer = this.createRenderer();
            document.body.appendChild(renderer.domElement);
            this.client = new wm.verse.VerseClient(renderer);
        }
        WebMetaverse.prototype.createRenderer = function () {
            var renderer = new THREE.WebGLRenderer();
            //renderer.setClearColor(0xf0ff00, 1000);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.autoClear = false;
            return renderer;
        };
        return WebMetaverse;
    })();
    wm.WebMetaverse = WebMetaverse;
    window.onload = function () {
        var webvr = new WebMetaverse();
        webvr.client.roomState.loadRoom('debug1');
        webvr.client.roomState.loadRoom('debug2');
        webvr.tick();
        webvr.client.roomState.switchToRoomWithId('debug1');
    };
})(wm || (wm = {}));
//# sourceMappingURL=webmetaverse.js.map