'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar, Nav, Container, Offcanvas } from 'react-bootstrap';
import { Menu, User, Settings, Info, LogOut } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function SettingsMenu() {
    const router = useRouter();
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const navigate = (path) => {
        handleClose();
        router.push(path);
    };

    return (
        <Navbar expand={false} className="bg-transparent p-0 shadow-none">
            <Container fluid className="justify-content-end p-0">
                <Navbar.Toggle
                    aria-controls="offcanvasNavbar"
                    onClick={handleShow}
                    className="border-0 p-0 focus:ring-0"
                    style={{ backgroundImage: 'none' }}
                >
                    <div className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                        <Menu size={24} />
                    </div>
                </Navbar.Toggle>
                <Navbar.Offcanvas
                    id="offcanvasNavbar"
                    aria-labelledby="offcanvasNavbarLabel"
                    placement="end"
                    show={show}
                    onHide={handleClose}
                >
                    <Offcanvas.Header closeButton>
                        <Offcanvas.Title id="offcanvasNavbarLabel" className="fw-bold">Menu</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        <Nav className="justify-content-end flex-grow-1 pe-3 d-flex flex-column gap-2">
                            <div
                                onClick={() => navigate('/dashboard')}
                                className="d-flex align-items-center gap-3 p-3 rounded hover:bg-light cursor-pointer text-decoration-none text-dark"
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="p-2 bg-primary-subtle text-primary rounded">
                                    <User size={20} />
                                </div>
                                <span className="fw-medium">My Profile</span>
                            </div>

                            <div
                                onClick={() => navigate('/settings')}
                                className="d-flex align-items-center gap-3 p-3 rounded hover:bg-light cursor-pointer text-decoration-none text-dark"
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="p-2 bg-primary-subtle text-primary rounded">
                                    <Settings size={20} />
                                </div>
                                <span className="fw-medium">Settings</span>
                            </div>

                            <div
                                onClick={() => navigate('/about')}
                                className="d-flex align-items-center gap-3 p-3 rounded hover:bg-light cursor-pointer text-decoration-none text-dark"
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="p-2 bg-primary-subtle text-primary rounded">
                                    <Info size={20} />
                                </div>
                                <span className="fw-medium">About App</span>
                            </div>

                            <hr className="my-3" />

                            <div
                                onClick={handleLogout}
                                className="d-flex align-items-center gap-3 p-3 rounded hover:bg-danger-subtle cursor-pointer text-danger"
                                style={{ cursor: 'pointer' }}
                            >
                                <LogOut size={20} />
                                <span className="fw-medium">Sign Out</span>
                            </div>
                        </Nav>
                    </Offcanvas.Body>
                </Navbar.Offcanvas>
            </Container>
        </Navbar>
    );
}
