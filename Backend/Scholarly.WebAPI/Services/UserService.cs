using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Scholarly.DataAccess;
using Scholarly.DataAccess.Repositories;
using Scholarly.Entity;
using Scholarly.WebAPI.DTOs.Auth;
using Scholarly.WebAPI.DTOs.Common;
using Scholarly.WebAPI.DTOs.User;
using Scholarly.WebAPI.Exceptions;
using Scholarly.WebAPI.Helper;

namespace Scholarly.WebAPI.Services
{
    public class UserService : IUserService
    {
        private readonly IRepository<tbl_users> _userRepository;
        private readonly SWBDBContext _context;
        private readonly IMapper _mapper;
        private readonly IJWTAuthenticationManager _jwtManager;
        private readonly ILogger<UserService> _logger;

        public UserService(
            IRepository<tbl_users> userRepository,
            SWBDBContext context,
            IMapper mapper,
            IJWTAuthenticationManager jwtManager,
            ILogger<UserService> logger)
        {
            _userRepository = userRepository;
            _context = context;
            _mapper = mapper;
            _jwtManager = jwtManager;
            _logger = logger;
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto login)
        {
            var user = await _userRepository.QueryAsNoTracking()
                .FirstOrDefaultAsync(u => u.emailid == login.EmailID);

            if (user == null)
            {
                _logger.LogWarning("Login attempt for non-existent user: {Email}", login.EmailID);
                throw new NotFoundException("User not found");
            }

            if (!PasswordHasher.VerifyPassword(user.password, login.Password))
            {
                _logger.LogWarning("Invalid password attempt for user: {Email}", login.EmailID);
                throw new UnauthorizedException("Invalid credentials provided");
            }

            var authResponse = await _jwtManager.AuthenticateAsync(user, _context);
            var dto = _mapper.Map<AuthResponseDto>(authResponse);

            _logger.LogInformation("User logged in successfully: {Email}", login.EmailID);
            return dto;
        }

        public async Task<UserDto> RegisterAsync(RegisterDto registerDto)
        {
            // Check if user already exists
            var existingUser = await _userRepository.FirstOrDefaultAsync(
                u => u.emailid == registerDto.EmailID);

            if (existingUser != null)
            {
                throw new BadRequestException("User with this email already exists");
            }

            var user = _mapper.Map<tbl_users>(registerDto);
            
            // Set fields that couldn't be set via AutoMapper
            user.password = PasswordHasher.HashPassword(registerDto.Password);
            user.activationcode = Guid.NewGuid();
            
            await _userRepository.AddAsync(user);
            await _userRepository.SaveChangesAsync();

            _logger.LogInformation("New user registered: {Email}", registerDto.EmailID);

            return _mapper.Map<UserDto>(user);
        }

        public async Task<bool> ConfirmEmailAsync(string token, string email)
        {
            var user = await _userRepository.FirstOrDefaultAsync(u => u.emailid == email);

            if (user == null)
            {
                throw new NotFoundException("User not found");
            }

            // Verify activation code
            if (user.activationcode.ToString() != token)
            {
                throw new BadRequestException("Invalid activation code");
            }

            user.isemailverified = 1;
            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync();

            _logger.LogInformation("Email confirmed for user: {Email}", email);
            return true;
        }

        public async Task<bool> UpdateUserDetailsAsync(int userId, UpdateUserDto updateDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);

            if (user == null)
            {
                throw new NotFoundException("User not found");
            }

            _mapper.Map(updateDto, user);
            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync();

            _logger.LogInformation("User details updated for userId: {UserId}", userId);
            return true;
        }

        public async Task<UserDto?> GetUserDetailsAsync(int userId)
        {
            var user = await _userRepository.QueryAsNoTracking()
                .Where(u => u.userid == userId)
                .FirstOrDefaultAsync();

            if (user == null)
            {
                throw new NotFoundException("User not found");
            }

            var userDto = _mapper.Map<UserDto>(user);

            // Get specialization if exists
            if (user.specialization_id.HasValue)
            {
                var specialization = await _context.tbl_user_specialization
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.specialization_id == user.specialization_id.Value);

                if (specialization != null)
                {
                    userDto.Specialization = specialization.specialization;
                }
            }

            return userDto;
        }

        public async Task<IEnumerable<SpecializationDto>> GetSpecializationsAsync()
        {
            var specializations = await _context.tbl_user_specialization
                .AsNoTracking()
                .Select(s => new SpecializationDto
                {
                    SpecializationId = s.specialization_id,
                    Specialization = s.specialization
                })
                .ToListAsync();

            return specializations;
        }
    }
}

