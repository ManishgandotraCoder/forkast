import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';

// No need to mock validator since we removed it

describe('UserController', () => {
    let controller: UserController;
    let userService: UserService;

    const mockUserService = {
        register: jest.fn(),
        login: jest.fn(),
        profile: jest.fn(),
    };

    const mockJwtAuthGuard = {
        canActivate: jest.fn(() => true),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        controller = module.get<UserController>(UserController);
        userService = module.get<UserService>(UserService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const registerDto = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const mockUser = {
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
            };

            mockUserService.register.mockResolvedValue(mockUser);

            const result = await controller.register(registerDto);

            expect(mockUserService.register).toHaveBeenCalledWith(registerDto);
            expect(result).toEqual(mockUser);
        });

        it('should propagate service errors', async () => {
            const registerDto = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const error = new BadRequestException('Email already exists');
            mockUserService.register.mockRejectedValue(error);

            await expect(controller.register(registerDto)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should handle validation errors', async () => {
            const registerDto = {
                email: 'invalid-email',
                password: '123',
                name: '',
            };

            const error = new BadRequestException('Validation failed');
            mockUserService.register.mockRejectedValue(error);

            await expect(controller.register(registerDto)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('login', () => {
        it('should login user successfully', async () => {
            const loginDto = {
                email: 'test@example.com',
                password: 'password123',
            };

            const mockLoginResponse = {
                access_token: 'jwt-token',
                name: 'Test User',
                email: 'test@example.com',
            };

            mockUserService.login.mockResolvedValue(mockLoginResponse);

            const result = await controller.login(loginDto);

            expect(mockUserService.login).toHaveBeenCalledWith(loginDto);
            expect(result).toEqual(mockLoginResponse);
        });

        it('should propagate service errors', async () => {
            const loginDto = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };

            const error = new UnauthorizedException('Invalid credentials');
            mockUserService.login.mockRejectedValue(error);

            await expect(controller.login(loginDto)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should handle validation errors', async () => {
            const loginDto = {
                email: 'invalid-email',
                password: '',
            };

            const error = new BadRequestException('Validation failed');
            mockUserService.login.mockRejectedValue(error);

            await expect(controller.login(loginDto)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('profile', () => {
        it('should return user profile successfully', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const mockProfile = {
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
            };

            mockUserService.profile.mockResolvedValue(mockProfile);

            const result = await controller.profile(mockRequest);

            expect(mockUserService.profile).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockProfile);
        });

        it('should propagate service errors', async () => {
            const mockUser = { id: 999 };
            const mockRequest = { user: mockUser };
            const error = new NotFoundException('User not found');
            mockUserService.profile.mockRejectedValue(error);

            await expect(controller.profile(mockRequest)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should handle database errors', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const error = new Error('Database connection failed');
            mockUserService.profile.mockRejectedValue(error);

            await expect(controller.profile(mockRequest)).rejects.toThrow(
                'Database connection failed',
            );
        });
    });
});
