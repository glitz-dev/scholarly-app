using AutoMapper;
using Scholarly.Entity;
using Scholarly.WebAPI.DTOs.Auth;
using Scholarly.WebAPI.DTOs.User;
using Scholarly.WebAPI.Helper;

namespace Scholarly.WebAPI.Mapping
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // User mappings
            CreateMap<tbl_users, UserDto>()
                .ForMember(dest => dest.UserId, opt => opt.MapFrom(src => src.userid))
                .ForMember(dest => dest.FirstName, opt => opt.MapFrom(src => src.firstname))
                .ForMember(dest => dest.LastName, opt => opt.MapFrom(src => src.lastname))
                .ForMember(dest => dest.EmailID, opt => opt.MapFrom(src => src.emailid))
                .ForMember(dest => dest.University, opt => opt.MapFrom(src => src.university))
                .ForMember(dest => dest.CurrentPosition, opt => opt.MapFrom(src => src.current_position))
                .ForMember(dest => dest.CurrentLocation, opt => opt.MapFrom(src => src.current_location))
                .ForMember(dest => dest.SpecializationId, opt => opt.MapFrom(src => src.specialization_id))
                .ForMember(dest => dest.Specialization, opt => opt.MapFrom(src => src.specialization));

            CreateMap<RegisterDto, tbl_users>()
                .ForMember(dest => dest.firstname, opt => opt.MapFrom(src => src.FirstName))
                .ForMember(dest => dest.lastname, opt => opt.MapFrom(src => src.LastName))
                .ForMember(dest => dest.emailid, opt => opt.MapFrom(src => src.EmailID))
                .ForMember(dest => dest.password, opt => opt.Ignore()) // Password will be hashed in service layer
                .ForMember(dest => dest.university, opt => opt.MapFrom(src => src.University))
                .ForMember(dest => dest.current_position, opt => opt.MapFrom(src => src.CurrentPosition))
                .ForMember(dest => dest.current_location, opt => opt.MapFrom(src => src.CurrentLocation))
                .ForMember(dest => dest.specialization_id, opt => opt.MapFrom(src => src.SpecializationId))
                .ForMember(dest => dest.activationcode, opt => opt.Ignore()) // Will be set in service layer
                .ForMember(dest => dest.isemailverified, opt => opt.MapFrom(src => (short)0))
                .ForMember(dest => dest.userid, opt => opt.Ignore())
                .ForMember(dest => dest.refresh_token, opt => opt.Ignore())
                .ForMember(dest => dest.refresh_token_expiry_time, opt => opt.Ignore())
                .ForMember(dest => dest.gender, opt => opt.Ignore())
                .ForMember(dest => dest.dateofbirth, opt => opt.Ignore())
                .ForMember(dest => dest.specialization, opt => opt.Ignore());

            CreateMap<UpdateUserDto, tbl_users>()
                .ForMember(dest => dest.firstname, opt => opt.MapFrom(src => src.FirstName))
                .ForMember(dest => dest.lastname, opt => opt.MapFrom(src => src.LastName))
                .ForMember(dest => dest.university, opt => opt.MapFrom(src => src.University))
                .ForMember(dest => dest.current_position, opt => opt.MapFrom(src => src.CurrentPosition))
                .ForMember(dest => dest.current_location, opt => opt.MapFrom(src => src.CurrentLocation))
                .ForMember(dest => dest.specialization_id, opt => opt.MapFrom(src => src.SpecializationId))
                .ForMember(dest => dest.userid, opt => opt.Ignore())
                .ForMember(dest => dest.emailid, opt => opt.Ignore())
                .ForMember(dest => dest.password, opt => opt.Ignore())
                .ForMember(dest => dest.activationcode, opt => opt.Ignore())
                .ForMember(dest => dest.isemailverified, opt => opt.Ignore())
                .ForMember(dest => dest.gender, opt => opt.Ignore())
                .ForMember(dest => dest.dateofbirth, opt => opt.Ignore())
                .ForMember(dest => dest.specialization, opt => opt.Ignore())
                .ForMember(dest => dest.refresh_token, opt => opt.Ignore())
                .ForMember(dest => dest.refresh_token_expiry_time, opt => opt.Ignore());

            // Auth Response mappings
            CreateMap<Model.AuthResponse, AuthResponseDto>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.status))
                .ForMember(dest => dest.Message, opt => opt.MapFrom(src => src.message))
                .ForMember(dest => dest.Token, opt => opt.MapFrom(src => src.token))
                .ForMember(dest => dest.RefreshToken, opt => opt.MapFrom(src => src.refreshToken))
                .ForMember(dest => dest.Expires, opt => opt.MapFrom(src => src.expires))
                .ForMember(dest => dest.EmailId, opt => opt.MapFrom(src => src.emailId));

            CreateMap<Model.TokenModel, RefreshTokenDto>()
                .ReverseMap();
        }
    }
}

