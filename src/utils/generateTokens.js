import jwt from 'jsonwebtoken'
export const generateAccessToken=(userId)=>{
    return jwt.sign(
        {user_id},
        process.env.JWT_ACCESS_SECRET,
        {expiresIn:'15m'}
    )
}

export const generateRefreshToken=(userId)=>{
    return jwt.sign(
        {user_id},
        process.env.JWT_REFRESH_SECRET,
        {expiresIn:'7d'}
    )
}