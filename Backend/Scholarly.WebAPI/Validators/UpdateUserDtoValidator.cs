using FluentValidation;
using Scholarly.WebAPI.DTOs.User;

namespace Scholarly.WebAPI.Validators
{
    public class UpdateUserDtoValidator : AbstractValidator<UpdateUserDto>
    {
        public UpdateUserDtoValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required")
                .MaximumLength(100).WithMessage("First name must not exceed 100 characters");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required")
                .MaximumLength(100).WithMessage("Last name must not exceed 100 characters");

            RuleFor(x => x.University)
                .MaximumLength(200).WithMessage("University must not exceed 200 characters")
                .When(x => !string.IsNullOrEmpty(x.University));

            RuleFor(x => x.CurrentPosition)
                .MaximumLength(200).WithMessage("Current position must not exceed 200 characters")
                .When(x => !string.IsNullOrEmpty(x.CurrentPosition));

            RuleFor(x => x.CurrentLocation)
                .MaximumLength(200).WithMessage("Current location must not exceed 200 characters")
                .When(x => !string.IsNullOrEmpty(x.CurrentLocation));
        }
    }
}

