
# Contract address: 0x05808c76d9fa24baae378ff2e1996d6d59120a60487778a85772b816f9bcf263
# Transaction hash: 0x2f8c8197f8874413e939b36a1733a6a8208c14fd267645cada9c49924e51056

# Declare transaction was sent.
# Contract class hash: 0x5e0f4cbbc1c3ba7603b15e6fc5f38450d84e482ffd5d376584c92a6d731e26d
# Transaction hash: 0x255787d55f6366bf3e5c40b8e1759387599846f32d62a1f434252cbc05bfea7


%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin, SignatureBuiltin
from starkware.cairo.common.math import assert_not_zero
from starkware.starknet.common.syscalls import get_caller_address
from openzeppelin.upgrades.library import Proxy


@storage_var
func balance() -> (value : felt):
end

@storage_var
func super_admin() -> (super_admin_public_key : felt):
end

@storage_var
func admin(admin_public_key : felt) -> (admin_public_key : felt):
end

# @constructor
# func constructor{
#     syscall_ptr: felt*,
#     pedersen_ptr: HashBuiltin*,
#     range_check_ptr,
# }(admin_address : felt):
#     super_admin.write(admin_address, value=admin_address)
#     return()
# end

@external
func initializer{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(proxy_admin: felt):
     Proxy.initializer(proxy_admin)
    super_admin.write(proxy_admin) 
    return ()
end

#
# Upgrades
#

@external
func upgrade{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }(new_implementation: felt):
    Proxy.assert_only_admin()
    Proxy._set_implementation_hash(new_implementation)
    return ()
end

@view
func view_super_admin{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }() -> (super_admin_address : felt):
       let (address) = super_admin.read()
    return (super_admin_address = address)
end

@external
func add_admin{
    syscall_ptr: felt*,
    pedersen_ptr: HashBuiltin*,
    range_check_ptr,
}(admin_address : felt):
    let (caller) = get_caller_address()
    let (is_super_admin) = super_admin.read()
    
     with_attr error_message(
            "Only super admin can add admin"):
        assert is_super_admin = caller
    end
    admin.write(admin_address, value=admin_address)
    return()
end

@external
func remove_admin{
    syscall_ptr: felt*,
    pedersen_ptr: HashBuiltin*,
    range_check_ptr,
}(admin_address : felt):
    let (caller) = get_caller_address()
    let (is_super_admin) = super_admin.read()
   

     with_attr error_message(
            "Only super admin can remove admin"):
        assert is_super_admin = caller
    end
    admin.write(admin_address, value=0)
    return()
end

@external
func transfer_admin_role{
    syscall_ptr: felt*,
    pedersen_ptr: HashBuiltin*,
    range_check_ptr,
}(new_admin_address : felt):
    let (caller) = get_caller_address()
    let (current_admin) = admin.read(caller)
   

     with_attr error_message(
            "Only existing admin can transfer admin role"):
        assert current_admin = caller
    end
    admin.write(new_admin_address, value=new_admin_address)
    return()
end

@external
func renounce_admin_role{
    syscall_ptr: felt*,
    pedersen_ptr: HashBuiltin*,
    range_check_ptr,
}():
    let (caller) = get_caller_address()
    let (current_admin) = admin.read(caller)
   

     with_attr error_message(
            "Only existing admin can renounce admin role"):
        assert current_admin = caller
    end
    admin.write(caller, value=0)
    return()
end

@external
func add_balance{syscall_ptr : felt*, range_check_ptr, pedersen_ptr: HashBuiltin*}(amount : felt):
    let (caller) = get_caller_address()
    let (current_admin) = admin.read(caller)
   
     with_attr error_message(
            "Only admin can add balance"):
        assert current_admin = caller
    end
    let (res) = balance.read()
    balance.write(res + amount)
    return()
end

@view
func view_balance{syscall_ptr : felt*, range_check_ptr, pedersen_ptr : HashBuiltin*}() -> (balance : felt):
    let (res) = balance.read()
    return (balance = res)
end

@view
func get_implementation_hash{syscall_ptr : felt*, range_check_ptr, pedersen_ptr : HashBuiltin*}() -> (class_hash : felt):
    let (res) = Proxy.get_implementation_hash()

    return (class_hash = res)
end

@external
func add_100{syscall_ptr : felt*, range_check_ptr, pedersen_ptr: HashBuiltin*}():
    let (caller) = get_caller_address()
    let (current_admin) = admin.read(caller)
   
     with_attr error_message(
            "Only admin can add balance"):
        assert current_admin = caller
    end
    let (res) = balance.read()
    balance.write(res + 100)
    return()
end

# Declare transaction was sent.
# Contract class hash: 0xb96ff60606c8d5ab032e7bce5d2d5fa7709a93e1834147cc189e82ded8a26f
# Transaction hash: 0xf4fc2e7d4162ace7ad3af239b4c116e8b89bc85c91a53145deb9b008820200