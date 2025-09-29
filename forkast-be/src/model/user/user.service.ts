// UserService: Business logic for user APIs
import {
    Injectable,
    Logger,
    BadRequestException,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RegisterDto, LoginDto } from './user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
    private logger = new Logger(UserService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(data: RegisterDto) {
        try {
            // Check if user already exists
            const existingUser = await this.prisma.user.findUnique({
                where: { email: data.email },
            });
            if (existingUser) {
                throw new BadRequestException('Email already exists');
            }

            const hashedPassword = await bcrypt.hash(data.password, 10);
            const user = await this.prisma.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    name: data.name,
                },
            });

            // Create initial USD balance for the user
            await this.prisma.balance.create({
                data: {
                    userId: user.id,
                    symbol: 'USD',
                    amount: 10000, // Initial balance
                },
            });
            this.logger.log(`User registered successfully: ${user.email}`);
            return { id: user.id, email: user.email, name: user.name };
        } catch (error) {
            this.logger.error(
                `Failed to register user: ${data.email}`,
                error.stack,
            );
            throw error;
        }
    }

    async login(data: LoginDto) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email: data.email },
            });
            if (
                !user ||
                !(await bcrypt.compare(data.password, user.password))
            ) {
                this.logger.warn(`Failed login attempt for: ${data.email}`);
                throw new UnauthorizedException('Invalid credentials');
            }
            const token = this.jwtService.sign({
                id: user.id,
                email: user.email,
            });
            this.logger.log(`User logged in successfully: ${user.email}`);
            return { access_token: token, name: user.name, email: user.email };
        } catch (error) {
            if (error.message !== 'Invalid credentials') {
                this.logger.error(
                    `Login error for: ${data.email}`,
                    error.stack,
                );
            }
            throw error;
        }
    }

    async profile(userId: number) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                this.logger.warn(`Profile not found for userId: ${userId}`);
                throw new NotFoundException('User not found');
            }
            this.logger.log(`Profile retrieved for: ${user.email}`);
            return { id: user.id, email: user.email, name: user.name };
        } catch (error) {
            this.logger.error(
                `Failed to get profile for userId: ${userId}`,
                error.stack,
            );
            throw error;
        }
    }
}
