"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export interface UserInfo {
  name: string;
  skillLevel: "junior" | "mid" | "senior" | "staff";
  role: string;
  experience?: string;
}

interface UserInfoFormProps {
  onSubmit: (userInfo: UserInfo) => void;
}

export default function UserInfoForm({ onSubmit }: UserInfoFormProps) {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "",
    skillLevel: "mid",
    role: "software-engineer",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (userInfo.name.trim()) {
      onSubmit(userInfo);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background w-full p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border border-border shadow-xl">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-2xl font-bold text-foreground">AI Interview</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your details to begin the interview session
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                  className="focus-visible:ring-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-foreground">
                  Position Applied For
                </Label>
                <Select
                  value={userInfo.role}
                  defaultValue="software-engineer"
                  onValueChange={(value) => setUserInfo({ ...userInfo, role: value })}
                >
                  <SelectTrigger id="role" className="w-full bg-background">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="software-engineer">Software Engineer</SelectItem>
                    <SelectItem value="frontend-developer">Frontend Developer</SelectItem>
                    <SelectItem value="backend-developer">Backend Developer</SelectItem>
                    <SelectItem value="fullstack-developer">Fullstack Developer</SelectItem>
                    <SelectItem value="devops-engineer">DevOps Engineer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level" className="text-sm font-medium text-foreground">
                  Experience Level
                </Label>
                <Select
                  value={userInfo.skillLevel}
                  defaultValue="mid"
                  onValueChange={(value) =>
                    setUserInfo({ ...userInfo, skillLevel: value as UserInfo["skillLevel"] })
                  }
                >
                  <SelectTrigger id="level" className="w-full bg-background">
                    <SelectValue placeholder="Select an experience level" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid-level (2-5 years)</SelectItem>
                    <SelectItem value="senior">Senior (5-8 years)</SelectItem>
                    <SelectItem value="staff">Staff/Principal (8+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-primary-foreground font-medium transition-all duration-200 shadow-md"
                  disabled={!userInfo.name || !userInfo.role || !userInfo.skillLevel || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    "Start Interview"
                  )}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
