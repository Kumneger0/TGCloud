import Swal from 'sweetalert2';

export async function getPhoneNumber() {
	return await Swal.fire({
		title: 'Enter your phone number',
		html: `
      <label for="phone-input">Phone Number (include country code, e.g., +1)</label>
      <input type="text" id="phone-input" class="swal2-input" placeholder="+1 (555) 555-5555">
    `,
		inputAttributes: {
			inputmode: 'tel',
			pattern: '\\+[0-9]{1,3}\\s?[0-9]{10}'
		},
		showCancelButton: true,
		confirmButtonColor: '#000000',

		preConfirm: () => {
			const phoneNumber = (Swal?.getPopup()?.querySelector('#phone-input') as HTMLInputElement)
				.value;
			if (!/^\+\d{1,3}\s?\d{10,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
				Swal.showValidationMessage(
					'Please enter a valid phone number with the country code, e.g., +1 (555) 555-5555'
				);
			}
			return phoneNumber;
		}
	}).then((result) => {
		if (!result.isConfirmed || !result.value) {
			throw new Error('Phone number entry cancelled');
        }
		return result.value as string;
    });
}

export async function getCode() {
	return await Swal.fire({
		title: 'Enter the verification code',
		html: `
      <label for="code-input">Verification Code</label>
      <input type="text" id="code-input" class="swal2-input" placeholder="Please enter the code you received from Telegram">
    `,
		inputAttributes: {
			inputmode: 'numeric',
			pattern: '[0-9]{5}'
		},
		showCancelButton: true,
		confirmButtonColor: '#000000',

		preConfirm: () => {
			const code = (Swal?.getPopup()?.querySelector('#code-input') as HTMLInputElement).value;
			if (!/^\d{5}$/.test(code)) {
				Swal.showValidationMessage('Please enter a valid 5-digit verification code.');
			}
			return code;
		}
	}).then((result) => {
		if (!result.isConfirmed || !result.value) {
			throw new Error('Verification code entry cancelled');
        }
        return result.value;
    });
}

export async function getPassword() {
	return await Swal.fire({
		title: 'Enter Your Password',
		html: `
      <label for="password-input">Password</label>
      <input type="password" id="password-input" class="swal2-input" placeholder="Please enter your password">
      <div style="display: flex; align-items: center; justify-content: center; margin-top: 10px;">
        <input type="checkbox" id="toggle-password">
        <label for="toggle-password" style="margin-left: 5px;">Show Password</label>
      </div>
    `,
		showCancelButton: true,
		confirmButtonColor: '#000000',
		didOpen: () => {
			const passwordInput = Swal?.getPopup()?.querySelector('#password-input') as HTMLInputElement;
			const togglePassword = Swal?.getPopup()?.querySelector(
				'#toggle-password'
			) as HTMLInputElement;

			togglePassword.addEventListener('change', () => {
				if (togglePassword.checked) {
					passwordInput.type = 'text';
				} else {
					passwordInput.type = 'password';
				}
			});
		},
		preConfirm: () => {
			const password = (Swal?.getPopup()?.querySelector('#password-input') as HTMLInputElement)
				.value;
			if (!password) {
				Swal.showValidationMessage('Please enter your password.');
			}
			return password;
		}
	}).then((result) => {
		if (!result.isConfirmed || !result.value) {
			throw new Error('Password entry cancelled');
        }
		return result.value as string;
    });
}
