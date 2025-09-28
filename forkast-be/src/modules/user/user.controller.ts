// UserController: Handles register, login, and profile APIs
import {
    Controller,
    Post,
    Body,
    Get,
    Put,
    UseGuards,
    Request,
    HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterResponseDto, LoginResponseDto, UserResponseDto } from '../../common/dto/user-response.dto';
import { ErrorResponseDto } from '../../common/dto/response.dto';

@ApiTags('users')
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post('register')
    @ApiOperation({
        summary: 'Register a new user',
        description: 'Create a new user account with email, password, and name'
    })
    @ApiBody({ type: RegisterDto })
    @ApiResponse({
        status: 201,
        description: 'User successfully registered',
        type: RegisterResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 409,
        description: 'Conflict - user already exists',
        type: ErrorResponseDto
    })
    async register(@Body() body: RegisterDto) {
        return this.userService.register(body);
    }

    @Post('login')
    @HttpCode(200)
    @ApiOperation({
        summary: 'Login user',
        description: 'Authenticate user with email and password to get access token'
    })
    @ApiBody({ type: LoginDto })
    @ApiResponse({
        status: 200,
        description: 'User successfully logged in',
        type: LoginResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid credentials',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
        type: ErrorResponseDto
    })
    async login(@Body() body: LoginDto) {
        return this.userService.login(body);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get user profile',
        description: 'Retrieve the authenticated user profile information'
    })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
        type: UserResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    async profile(@Request() req) {
        return this.userService.profile(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Put('profile')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update user profile',
        description: 'Update the authenticated user profile information'
    })
    @ApiBody({ type: UpdateProfileDto })
    @ApiResponse({
        status: 200,
        description: 'User profile updated successfully',
        type: UserResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
        type: ErrorResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
        type: ErrorResponseDto
    })
    async updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
        return this.userService.updateProfile(req.user.id, body);
    }
}
